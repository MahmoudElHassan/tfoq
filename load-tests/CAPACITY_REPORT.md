# Load-test capacity report

> Fill in after every staging run. Keep the most recent results at the top.

## Run: YYYY-MM-DD HH:MM

**Environment**

| Item               | Value                                       |
|--------------------|---------------------------------------------|
| Supabase project   | `vnphkmvzglbaxfbvnowp` (staging)            |
| Region             | <fill>                                      |
| Plan               | <fill — Free / Pro / Team>                  |
| Concurrent VUs     | <peak observed>                             |
| Total iterations   | <k6 output>                                 |
| Duration           | <k6 output>                                 |

**Thresholds (from script defaults)**

| Metric                              | Target        | Observed      | Pass? |
|-------------------------------------|---------------|---------------|-------|
| `login_errors`                      | < 1%          |               |       |
| `submit_failures`                   | < 5%          |               |       |
| `submit_duration_ms` p95            | < 600ms       |               |       |
| `submit_duration_ms` p99            | < 1500ms      |               |       |
| `read_latency_ms` p95               | < 400ms       |               |       |
| `http_req_duration` p95 (overall)   | < 800ms       |               |       |
| `idempotency_collisions` / VU       | ≈ 1 per iter  |               |       |

**`AdminLiveMonitor` snapshots**

- Peak attempts/minute reached during run: ___
- Peak active students: ___
- Error rate in monitor: ___

**Supabase dashboard**

- `quiz_attempts` insert rate vs baseline: ___
- `submit_quiz_attempt` RPC latency p95: ___
- Row counts matched expected VUs × submissions: ___

**Notes / root causes**

- <write here>

**Decision**

- [ ] Promote to production unchanged
- [ ] Promote + add: ___
- [ ] Hold: <action items>

---

## Run: <previous>
…copy template above and fill in…
