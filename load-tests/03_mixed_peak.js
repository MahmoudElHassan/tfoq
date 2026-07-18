// Mixed peak — simulates a realistic exam window: students log in,
// open the wheel, submit attempts with realistic gaps. Use this as the
// primary capacity test for the dashboard.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  config,
  fetchQuestions,
  loginStudent,
  seedStudents,
  submitAttempt,
  randomChoice,
  defaultThresholds,
} from "./lib.js";

const readLatency = new Trend("read_latency_ms");
const submitLatency = new Trend("submit_latency_ms");
const errors = new Rate("errors");

export const options = {
  scenarios: {
    mixed_peak: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },  // warm-up
        { duration: "1m",  target: 200 }, // steady
        { duration: "2m",  target: 400 }, // sustained peak
        { duration: "30s", target: 0 },   // cool-down
      ],
    },
  },
  thresholds: {
    ...defaultThresholds,
    read_latency_ms: ["p(95)<400"],
    submit_latency_ms: ["p(95)<600"],
    errors: ["rate<0.02"],
  },
};

export function setup() {
  const http_ = http;
  const users = seedStudents(450);
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
  // Pre-fetch one question pool so we don't double-count Auth latency.
  const lr = http_.post(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: signed[0].email, password: signed[0].password }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    },
  );
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
  if (!data.users?.length || !data.questions?.length) {
    sleep(1);
    return;
  }

  const u = data.users[(__VU - 1) % data.users.length];
  // 1) Login
  const lr = loginStudent(http, u);
  if (!lr.ok) {
    errors.add(1);
    sleep(1);
    return;
  }

  // 2) Read question pool (simulates opening the quiz page)
  const t1 = Date.now();
  const r = fetchQuestions(http, lr.access_token, null, 30);
  readLatency.add(Date.now() - t1);
  if (!r.ok) {
    errors.add(1);
    return;
  }
  const pool = r.questions?.length ? r.questions : data.questions;
  const q = pool[Math.floor(Math.random() * pool.length)];

  // 3) Submit attempt
  const t2 = Date.now();
  const sub = submitAttempt(
    http,
    lr.access_token,
    q.id,
    randomChoice(),
    `${u.email}-${Date.now()}-${Math.random()}`,
  );
  submitLatency.add(Date.now() - t2);
  errors.add(!sub.ok);

  // Realistic human-ish pacing between questions.
  sleep(Math.random() * 1.5 + 0.4);
}
