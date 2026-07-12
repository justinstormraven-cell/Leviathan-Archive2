---
name: StormRaven real shell & process control
description: StormRaven OS is not a simulation — it executes real host commands and spawns real processes; how auth gates it and why it must stay gated.
---

# StormRaven: real system control

StormRaven OS was deliberately converted from a simulated demo into real system
control. Treat these surfaces as live and dangerous:

- **Terminal** (`POST /api/terminal`) runs arbitrary commands on the host via
  `child_process.exec`. It persists a per-session working directory (`cd` is
  handled in-process).
- **Modules** (`PATCH /api/modules/:id`) spawn/kill REAL detached background
  processes with real PIDs.
- **Realms/metrics** report real disk (`df`), real CPU sampling, and real
  per-realm process counts (scanning `/proc/*/cwd`).

## The rule
All sensitive control surfaces (terminal endpoints AND module mutation) must
stay behind `requireAuth`. GET/read endpoints (metrics, realms, module list,
audit) are intentionally public so the dashboard works without login.

**Why:** a code review flagged that ungated module mutation = public real
process control, and that leaking command text into the (public) audit feed
exposes operator history. Both were fixed; do not regress.

## How to apply
- Auth is a hand-rolled HMAC token signed with `SESSION_SECRET`; the server
  **refuses to start** if `SESSION_SECRET` is missing (no insecure fallback).
- Login password is the `STORMRAVEN_PASSWORD` secret, checked timing-safely.
- Never log raw terminal command text into `audit_logs` (public); full history
  lives only in the auth-gated `/terminal/history`.
- Process kills are identity-bound (verify `/proc/<pid>/environ` contains
  `STORMRAVEN_MODULE=<codename>` before killing) with SIGTERM→wait→SIGKILL — do
  not revert to raw PID-only kills (PID reuse could kill the wrong process).
- Deploying this app exposes a real shell publicly behind a single password;
  flag that risk before any deploy/scope change.
