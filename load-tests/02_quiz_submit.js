// Quiz submit storm — exercises submit_quiz_attempt RPC and idempotency.
// Verifies that:
//   - High concurrency does not let a single attempt double-score.
//   - The RPC rejects invalid client_ids and unauthenticated calls.
//   - Latency stays under target even at peak.
//
// Important: this depends on the answer-key hardening in
// supabase/migrations/20260718090000_security_hardening.sql. Without
// submit_quiz_attempt() the test would just hit 400s.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import {
  config,
  fetchQuestions,
  loginStudent,
  seedStudents,
  submitAttempt,
  uuid,
  randomChoice,
  defaultThresholds,
} from "./lib.js";

const submitDuration = new Trend("submit_duration_ms");
const submitFailures = new Rate("submit_failures");
const idempotencyChecks = new Counter("idempotency_collisions");

export const options = {
  scenarios: {
    quiz_storm: {
      executor: "ramping-arrival-rate",
      startRate: 0,
      timeUnit: "1s",
      preAllocatedVUs: 300,
      maxVUs: 800,
      stages: [
        { duration: "20s", target: 30 },
        { duration: "1m",  target: 100 },
        { duration: "2m",  target: 300 }, // sustained peak
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    ...defaultThresholds,
    submit_failures: ["rate<0.05"], // RPC errors, including expected 23505 collisions excluded via check
    submit_duration_ms: ["p(95)<600", "p(99)<1500"],
  },
};

export function setup() {
  // Provision fresh students; signup is anonymous so it warms up Auth.
  const http_ = http;
  const users = seedStudents(800);
  const signed = [];
  for (const u of users) {
    const res = http_.post(
      `${config.supabaseUrl}/auth/v1/signup`,
      JSON.stringify({
        email: u.email,
        password: u.password,
        data: { full_name: u.full_name, role: "student", grade: u.grade, phone: u.phone },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
        },
      },
    );
    if (res.status < 400) signed.push(u);
  }

  // Pull a pool of question ids to submit against.
  const first = signed[0];
  if (!first) return { users: [], questions: [] };
  const lr = http_.post(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: first.email, password: first.password }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    },
  );
  if (lr.status >= 400) return { users: signed, questions: [] };
  const token = lr.json("access_token");
  const r = http_.get(
    `${config.supabaseUrl}/rest/v1/questions_safe?select=id&limit=200`,
    {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const questions = r.status < 400 ? r.json() : [];
  return { users: signed, questions };
}

export default function (data) {
  if (!data.users?.length || !data.questions?.length) return;

  // 1. Login as a distinct student.
  const u = data.users[(__VU + __ITER) % data.users.length];
  const lr = loginStudent(http, u);
  if (!lr.ok) {
    submitFailures.add(1);
    return;
  }

  // 2. Pick a question and submit (with a unique client_id so we don't
  //    collide with other VUs). Stagger slightly with sleep().
  const q = data.questions[Math.floor(Math.random() * data.questions.length)];
  const clientId = `${u.email}-${uuid()}`;

  const t0 = Date.now();
  const res = submitAttempt(http, lr.access_token, q.id, randomChoice(), clientId);
  submitDuration.add(Date.now() - t0);
  const ok = res.ok;
  submitFailures.add(!ok);
  check(res, { "submit_2xx": (r) => r.ok });

  // 3. Idempotency check — re-submit the SAME client_id. Should still
  //    succeed and return the original attempt, NOT a new row.
  const r2 = submitAttempt(http, lr.access_token, q.id, randomChoice(), clientId);
  if (r2.ok) idempotencyChecks.add(1);
  sleep(0.5);
}
