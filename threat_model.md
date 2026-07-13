# Threat Model

## Project Overview

StormRaven OS is a Norse-mythology-themed system control plane built on Node.js 24, Express 5, and TypeScript. It provides an authenticated operator shell with filesystem access, process management, system metrics, realm/module lifecycle management, and an AI chat assistant (Leviathan). The API server is the backend; frontends are a React web app (`stormraven`) and a React Native mobile app. Data is stored in PostgreSQL via Drizzle ORM.

**Tech stack:** Node.js 24, Express 5, TypeScript, Drizzle ORM, PostgreSQL, OpenAI API, Replit Auth (OIDC), esbuild.

**Users:** A single privileged operator authenticates using a password (`STORMRAVEN_PASSWORD`) and receives a short-lived HMAC-signed bearer token. A secondary Replit OIDC auth path exists for browser-based sessions.

## Assets

- **Operator bearer token / session** — grants access to shell execution, filesystem read/write, and AI assistant. Compromise = full host compromise.
- **`SESSION_SECRET`** — used to sign operator bearer tokens. Exposure allows minting arbitrary tokens offline.
- **`STORMRAVEN_PASSWORD`** — the operator password. No MFA; brute-forceable if unenforced.
- **`DATABASE_URL`** — PostgreSQL connection string. Exposure gives full DB access.
- **`OPENAI_API_KEY`** — used by Leviathan chat. Exposure allows arbitrary OpenAI API usage.
- **Host filesystem** — the API server can read/write arbitrary paths; operator tokens must be tightly guarded.
- **Terminal history & audit logs** — contain command output and security events.

## Trust Boundaries

- **Public Internet → API Server** — the `/api/*` prefix is the production entry point. All unauthenticated and authenticated traffic crosses here. The boundary is only as strong as what each individual route enforces.
- **Bearer Token Auth boundary** — routes protected by `requireAuth` vs. routes with no auth check whatsoever.
- **API Server → PostgreSQL** — Drizzle ORM parameterizes queries; low SQL injection risk.
- **API Server → OpenAI** — server-side API key; client-supplied conversation content is forwarded.
- **API Server → Host OS** — `exec()` with user-supplied commands; the shell has no sandboxing.

## Scan Anchors

- **Primary entry point:** `artifacts/api-server/src/app.ts` → `artifacts/api-server/src/routes/index.ts`
- **Highest-risk code areas:**
  - `artifacts/api-server/src/routes/terminal.ts` — shell execution via `exec()`
  - `artifacts/api-server/src/lib/fs-explorer.ts` — filesystem read/write/list with no path restriction
  - `artifacts/api-server/src/routes/fs.ts` — filesystem API routes
  - `artifacts/api-server/src/app.ts` — CORS configuration
- **Auth-protected routes:** `/terminal`, `/fs/*`, `/leviathan/chat`, `/auth/me`, module mutation endpoints
- **Unprotected routes (intentional or missing):** `/realms`, `/realms/:id`, `/modules`, `/modules/:id`, `/audit-logs`, `/system/metrics`, `/system/processes`, `/packages`, `/health`
- **Auth logic:** `artifacts/api-server/src/lib/auth.ts` (operator token), `artifacts/api-server/src/lib/replitAuth.ts` (OIDC)

## Threat Categories

### Spoofing

Operator authentication is via a password checked with `timingSafeEqual` and a resulting HMAC-SHA256 bearer token. The token implementation is sound. However, there is no rate limiting on the `/auth/login` endpoint, allowing offline or online brute-forcing of `STORMRAVEN_PASSWORD`.

**Guarantee required:** Login attempts MUST be rate-limited (e.g., 5 attempts / minute per IP).

### Tampering

The filesystem write endpoint (`POST /fs/write`) accepts arbitrary absolute paths without restricting writes to a sandboxed directory. An authenticated operator can overwrite any file the process user can access (e.g., application code, cron jobs, sudoers).

**Guarantee required:** Filesystem operations MUST be restricted to a declared root directory (e.g., `/home/runner/workspace`).

### Information Disclosure

Multiple routes expose sensitive operational data with no authentication:
- `/realms` and `/realms/:id` expose realm names, mount paths, disk usage, and process counts.
- `/modules` exposes module commands and file paths.
- `/audit-logs` exposes the full audit trail including auth failures.
- `/system/metrics` and `/system/processes` expose host resource usage and running process details.

CORS is configured with `origin: true, credentials: true`, reflecting any origin with cookies, enabling cross-site data exfiltration from any malicious page.

**Guarantees required:** Sensitive operational routes MUST require authentication. CORS origin MUST be restricted to known frontend origins.

### Denial of Service

No rate limiting on any API endpoint. The terminal endpoint runs arbitrary commands with a 20-second timeout; chained requests could exhaust server resources.

### Elevation of Privilege

The `/terminal` endpoint passes user-supplied strings directly to `/bin/bash` via `exec()`. There is no command allowlist, blocklist, or sandboxing. Any authenticated operator can execute arbitrary OS commands. Additionally, path traversal in the filesystem API allows reading sensitive host files (e.g., `/etc/shadow`, `~/.ssh/id_rsa`).
