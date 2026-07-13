---
name: RoE / authorization enforcement (StormRaven)
description: Authorization gates (Rules of Engagement) must be enforced server-side, per operator — never UI-only
---

# RoE / authorization enforcement

Any authorization policy (the Rules-of-Engagement gate especially) must be enforced on
the **server**, not just as a desktop overlay. A client-only gate is bypassable: a valid
operator Bearer token can call privileged APIs directly, and there is a render window
before the UI resolves gate state.

**Rules:**
- Enforce with middleware that runs AFTER auth (it needs the resolved operator), applied
  to every privileged/mutating route. Missing acceptance → `403 {code:"ROE_REQUIRED"}`.
- Scope acceptance to the authenticated operator `(operator, roeVersion)`, not globally by
  version — otherwise one acceptance authorizes every token holder and overstates posture.
- Keep only read-only reporting views (posture/compliance) on auth-alone, so posture can
  report on RoE state without a circular gate.

**Why:** architect review flagged the original UI-only gate as a broken control boundary
and version-only acceptance as overstating `roeAccepted`. Both confirmed fixed (403
pre-accept, 200 post-accept, 401 no token).

**How to apply:** new privileged/mutating routes go behind the RoE gate, never auth alone;
never move a real-shell/fs route out of it.
