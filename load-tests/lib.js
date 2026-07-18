// Shared helpers + constants for all k6 scripts.
// Run via `k6 run -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... <script.js>`
// or copy the .env below into a local .env file.

const SUPABASE_URL = __ENV.SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "YOUR-ANON-KEY";

export const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
};

// Standard thresholds — tighter for the quiz flow because every student
// hitting the wheel is a true exam integrity moment.
export const defaultThresholds = {
  http_req_failed: ["rate<0.02"],
  http_req_duration: ["p(95)<800"],
};

export const authThresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<1500"],
};

// --------------------------------------------------------------------------
// Token bucket — allocates one virtual student per VU and pre-signs it up.
// Called from setup() so the actual VU code only exercises login + quiz.
//
//   const users = seedStudents(200);
//   ...
//   const u = users[__VU - 1];
// --------------------------------------------------------------------------
export function seedStudents(count) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    const email = `lt+${Date.now()}.${i}@tfoq-loadtest.local`;
    users.push({
      email,
      password: "LoadTest!2026",
      full_name: `Load Test Student ${i}`,
      role: "student",
      grade: "ثالث ثانوي",
      phone: `+96650000${String(i).padStart(4, "0")}`,
    });
  }
  return users;
}

// Sign up a single student via Supabase Auth REST API (anonymous call,
// only allowed because the rate of signup is bounded by the test config).
// Returns the access_token on success.
export function signupStudent(http, user) {
  const url = `${config.supabaseUrl}/auth/v1/signup`;
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    data: {
      full_name: user.full_name,
      role: user.role,
      grade: user.grade,
      phone: user.phone,
    },
  });
  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });
  if (res.status >= 400) {
    return { ok: false, status: res.status, body: res.body };
  }
  const body = res.json();
  return {
    ok: true,
    access_token: body.access_token,
    user_id: body.user?.id,
    email: user.email,
  };
}

// Sign in an already-existing student.
export function loginStudent(http, user) {
  const url = `${config.supabaseUrl}/auth/v1/token?grant_type=password`;
  const payload = JSON.stringify({ email: user.email, password: user.password });
  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });
  if (res.status >= 400) {
    return { ok: false, status: res.status, body: res.body };
  }
  const body = res.json();
  return {
    ok: true,
    access_token: body.access_token,
    user_id: body.user?.id,
    email: user.email,
  };
}

// Fetch N random questions using the safe view (no answer key exposed).
export function fetchQuestions(http, accessToken, subjectId = null, limit = 20) {
  let url = `${config.supabaseUrl}/rest/v1/questions_safe?select=id,question_text,option_a,option_b,option_c,option_d,explanation,points,difficulty&limit=${limit}`;
  if (subjectId) url += `&subject_id=eq.${subjectId}`;
  const res = http.get(url, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status >= 400) return { ok: false, body: res.body };
  return { ok: true, questions: res.json() };
}

// Submit one quiz attempt through the idempotent RPC. client_id is the
// idempotency key — the same payload sent twice should not double-score.
export function submitAttempt(http, accessToken, questionId, option, clientId) {
  const url = `${config.supabaseUrl}/rest/v1/rpc/submit_quiz_attempt`;
  const payload = JSON.stringify({
    p_question_id: questionId,
    p_selected: option,
    p_client_id: clientId,
  });
  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return {
    ok: res.status < 400,
    status: res.status,
    body: res.body,
  };
}

export function uuid() {
  // RFC 4122 v4 — works without crypto module in Goja.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const randomChoice = () => "ABCD"[Math.floor(Math.random() * 4)];
