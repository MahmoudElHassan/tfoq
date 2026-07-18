# Load tests (k6)

## What this exercises

Three k6 scripts cover the highest-risk flows after the answer-key and
scoring hardening:

| Script                | What it stresses                                      | Targets                          |
|-----------------------|-------------------------------------------------------|----------------------------------|
| `01_login.js`         | Supabase Auth sign-in throughput                       | rate<1% errors, p95<1500ms       |
| `02_quiz_submit.js`   | `submit_quiz_attempt` RPC + idempotency on `client_id` | rate<5% errors, p95<600ms        |
| `03_mixed_peak.js`    | login → wheel page load → submit, with human pacing    | rate<2% errors, p95<800ms        |

All three depend on the migration
`supabase/migrations/20260718090000_security_hardening.sql` —
that migration introduces the RPC + `client_id` UNIQUE that
`02_quiz_submit.js` verifies.

## Prerequisites

- k6: `brew install k6` (macOS) or follow https://k6.io/docs/get-started/installation/
- A staging Supabase project seeded with:
  - At least one subject and ~200 questions (so the script can hit
    `submit_quiz_attempt`).
  - The migrations applied, in order, up to and including the
    security-hardening migration.

## Run

```bash
# Export credentials (NEVER commit these)
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"

# 1. Login storm
k6 run load-tests/01_login.js

# 2. Quiz submit storm (also runs the idempotency check)
k6 run load-tests/02_quiz_submit.js

# 3. Mixed peak (the canonical capacity test)
k6 run load-tests/03_mixed_peak.js
```

You can override arrival rates with `k6 run --vus 200 --duration 3m ...`,
or export a JSON summary:

```bash
k6 run --summary-export=results/login_$(date +%s).json load-tests/01_login.js
```

## Capacity notes (fill in after each staging run)

After each run, capture:

- `vus` / `iterations`
- `http_reqs`, `http_req_duration{p(95),p(99)}`
- `submit_duration_ms{p(95),p(99)}`
- `errors` / `login_errors` / `submit_failures`
- `idempotency_collisions` (every SAME-`client_id` re-submit must succeed;
  the counter should grow at the rate of the loop)
- Supabase metrics page: p95 read latency for `quiz_attempts` and
  `submit_quiz_attempt` RPC, total rows written, RPS to REST.

Watch `AdminLiveMonitor` while running — it polls every 15s during activity
and shows attempts-per-minute + active students.

### Recommended indexes (already shipped)

These were added in `20260509131537_*`:

- `idx_quiz_attempts_attempted_at` (DESC)
- `idx_quiz_attempts_student_time` (student_id, attempted_at DESC)
- `idx_quiz_attempts_student_question` (student_id, question_id)
- `idx_quiz_attempts_correct_time` partial on `is_correct = true`
- `idx_profiles_total_points` partial on `is_active = true`

If p95 on `submit_quiz_attempt` regresses beyond 600ms during the run,
check `EXPLAIN ANALYZE` on the same call — the existing indexes cover
the read path but the unique `client_id` lookup also goes through HOT.

## What we are NOT testing here

- Static-asset delivery (handled by Vercel CDN in front of Vite).
- Real WebSocket subscriptions on `quiz_attempts` (Realtime uses
  replication slots; out of scope for k6).
- Browser-rendered animation frames in `Quiz.tsx` (covered by
  Lighthouse in `AdminLiveMonitor`'s perf sampling, separately).

## Recommended plan based on results

| p95 `submit_quiz_attempt` | Recommendation                                  |
|--------------------------|------------------------------------------------|
| < 250ms                  | Keep current plan; capacity is healthy         |
| 250–500ms                | Warm connection pooling; consider read replica |
| 500ms–1s                 | PgBouncer in front of Postgres; add cache      |
| > 1s                     | Investigate; likely need horizontal scale      |

| p95 Auth login            | Recommendation                                  |
|--------------------------|------------------------------------------------|
| < 400ms                  | Healthy                                         |
| 400ms–1s                 | Acceptable; check Supabase region pinging       |
| > 1s                     | Investigate auth abuse / network jitter         |
