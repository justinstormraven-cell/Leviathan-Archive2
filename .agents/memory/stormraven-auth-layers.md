---
name: StormRaven auth layers
description: Two independent, coexisting auth systems in StormRaven and the rules for keeping them separate.
---

# StormRaven: two auth layers (do not conflate)

StormRaven has TWO independent authentication systems that must stay separate:

1. **Replit Auth (OIDC)** — the outer *front door*. A signed-in user is required
   to ENTER the desktop. Enforced in the FRONTEND (`ReplitAuthGate` wraps
   `Desktop`). Its server middleware (`authMiddleware`) is app-wide but
   **non-blocking** — it only hydrates `req.user` from the session, never rejects.
2. **Operator password gate** — the real authorization boundary. Hand-rolled
   HMAC Bearer token from `STORMRAVEN_PASSWORD`; `requireAuth` is the ONLY control
   protecting the dangerous APIs (real shell, module process toggles, fs writes,
   Leviathan). See `stormraven-real-shell.md`.

**Why:** user chose an additive "front door" — Replit login to see the OS, but
operator password still guards anything that touches the real host. Replit Auth
is a UX gate, **not** a backend security boundary; read-only telemetry endpoints
remain public by design.

## How to apply
- The skill's copy commands would OVERWRITE the operator files
  (`lib/auth.ts`, `routes/auth.ts`). Replit Auth was therefore installed under
  RENAMED paths (`lib/replitAuth.ts`, `routes/replitAuth.ts`); imports patched
  accordingly. Never let the templates clobber the operator auth.
- Route namespaces are distinct: operator = `/api/auth/login`, `/api/auth/me`;
  Replit = `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`,
  `/api/mobile-auth/*`. Keep them from colliding.
- If you ever move the front door to the backend (block public endpoints), do it
  with `req.isAuthenticated()` checks — do not weaken the operator gate to do it.

## zod v3 + orval gotcha (bit us here)
This repo pins **zod v3**. Do NOT put `format: email` or `format: uri` in
OpenAPI schemas — orval v8 emits top-level `zod.email()` / `zod.url()` which are
**zod v4-only** and fail typecheck in `lib/api-zod`. Use a plain `string`.
