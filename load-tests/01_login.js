// Concurrent login storm. Verifies Auth API throughput, latency, error rate.
// Run:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... k6 run load-tests/01_login.js
//
// Pre-requisite: load-tests/00_seed.js was run earlier so the student
// accounts exist. This script only signs them in.

import http from "k6/http";
import { check } from "k6";
import { Trend, Rate } from "k6/metrics";
import { config, loginStudent, seedStudents, authThresholds } from "./lib.js";

const loginDuration = new Trend("login_duration_ms");
const loginErrors = new Rate("login_errors");

export const options = {
  scenarios: {
    login_storm: {
      executor: "ramping-arrival-rate",
      startRate: 0,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: "30s", target: 20 },   // warm-up
        { duration: "1m",  target: 80 },   // steady 80 RPS
        { duration: "1m",  target: 200 },  // peak 200 RPS
        { duration: "30s", target: 0 },    // cool-down
      ],
    },
  },
  thresholds: {
    ...authThresholds,
    login_errors: ["rate<0.01"],
    "http_req_duration{group:::login_storm}": ["p(95)<1500", "p(99)<3000"],
  },
};

// Setup: provision 500 student accounts in the DB so the storm can sign them in.
export function setup() {
  const http_ = http;
  const users = seedStudents(500);
  const ok = [];
  for (const u of users) {
    // Use the same signup helper; many will fail with "already registered"
    // and that's fine — we only care that one of them exists.
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
    if (res.status < 400) ok.push(u);
  }
  return { users: ok };
}

export default function (data) {
  if (!data.users || data.users.length === 0) return;
  // Round-robin across available users so we always log in distinct ones.
  const u = data.users[(__VU + __ITER) % data.users.length];
  const t0 = Date.now();
  const res = loginStudent(http, u);
  loginDuration.add(Date.now() - t0);
  const ok = res.ok && !!res.access_token;
  loginErrors.add(!ok);
  check(res, {
    "login_status_2xx": (r) => r.ok,
    "login_has_token": (r) => r.ok && !!r.access_token,
  });
}
