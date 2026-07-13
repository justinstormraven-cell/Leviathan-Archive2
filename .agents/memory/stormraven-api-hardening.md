---
name: StormRaven API security hardening
description: CORS allowlist and login rate-limiting invariants for artifacts/api-server
---

# API-server security invariants

Two hardening decisions on `artifacts/api-server` that must not be silently reverted.

## CORS must never reflect arbitrary origins with credentials
- `app.ts` builds an **allowlist** of origins from `REPLIT_DOMAINS` (comma-separated),
  `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, plus localhost ports in non-production.
- The `cors` `origin` callback reflects the Origin only if it is in the allowlist;
  requests with no Origin (same-origin, curl, native mobile) are allowed.
- **Why:** `cors({ origin: true, credentials: true })` echoes any Origin while allowing
  credentials — any malicious site can then read authenticated responses via the session
  `sid` cookie. Never restore `origin: true` alongside `credentials: true`.
- **How to apply:** to permit a new frontend host, add it to the Replit domain env or the
  allowlist builder — do not widen to reflect-all.

## Login endpoint must stay rate-limited
- `POST /api/auth/login` is wrapped with the in-memory `rateLimit()` middleware
  (`lib/rateLimit.ts`): 10 attempts / 15 min per client IP, returns 429 + Retry-After.
- Client IP comes from `x-forwarded-for` (first hop), NOT `trust proxy`, so a proxy
  misconfig can't silently disable throttling.
- **Why:** the single-operator password is the only gate on real shell access; without a
  throttle it is brute-forceable at thousands of guesses/sec.
