# Codex Runner Part 3: Hardening, Ops, and Tests

## Goal
Harden the runner for reliable operations: retention, redaction correctness, observability, recovery edge cases, and full automated tests.

## Scope
- Log redaction guarantees and test coverage
- Retention/cleanup jobs
- Metrics and structured audit events
- Operational diagnostics and startup checks
- Expanded unit/integration/API tests

## Deliverables
1. Redaction and log pagination hardening in backend runner API/service
2. Retention cleanup job in backend startup scheduler loop
3. Metrics and structured logging fields for runner lifecycle
4. Extended test suite (unit + integration + API)
5. Documentation updates (env vars, runbook, failure modes)

## Implementation Steps
1. Redaction hardening
- Version regex set for secret masking
- Deterministic redact-on-read behavior
- Enforce response `limit` after redaction
- Define offsets on redacted UTF-8 stream only

2. Retention cleanup
- Daily cleanup cadence
- Delete `runner_job_events` then old `runner_jobs`
- Remove orphaned log files
- Preserve newest 100 terminal jobs for debugging

3. Observability and audit
- Metrics:
  - `runner_jobs_queued`
  - `runner_jobs_running`
  - `runner_job_starts_total`
  - `runner_job_failures_total`
  - `runner_job_timeouts_total`
  - `runner_job_cancellations_total`
  - `runner_scheduler_lock_acquired`
- Structured logs for terminal transitions with duration
- Audit events for create/cancel/recovery/final status transitions

4. Operational checks
- Verify script executability at startup
- Verify log dir exists/writable
- Verify allowlisted repo path exists
- Surface queue depth + launcher lock diagnostics

5. Full test coverage
- Unit: arg validation, command assembly, state machine, hash canonicalization, redaction invariants
- Integration: create-run-success, cancel queued, cancel running, timeout, stale heartbeat recovery
- API: auth on all routes, log pagination, idempotency race, conflicting key payload `409`, queue-full `429`

## Acceptance Criteria
- Redaction does not break pagination semantics
- Cleanup is safe and repeatable
- Key metrics and audit events are emitted for all lifecycle edges
- Crash/restart edge cases are covered by tests
- CI test suite is stable

## Exit Checklist
- All runner tests pass
- Documentation updated for operators
- No known P1/P2 gaps remain for v1 rollout
- Feature ready for production trial

