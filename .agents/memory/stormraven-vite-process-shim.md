---
name: Vite client bundle "Can't find variable: process"
description: Why the stormraven Vite config defines process.env keys, and how to fix similar bare-process crashes from dependencies.
---

# Bare `process` references crash the browser bundle

Some deps reference `process.env.*` **unguarded** (no `typeof process` check).
Vite does NOT auto-shim `process` in the client, so at runtime the browser
throws `Can't find variable: process` (Safari wording) / `process is not
defined`. In this project the offender was **react-rnd** (bundles
react-draggable), which does `if (process.env.DRAGGABLE_DEBUG) console.log(...)`.

**Fix:** add a `define` in `artifacts/stormraven/vite.config.ts` mapping the
specific keys to literals, e.g. `'process.env.DRAGGABLE_DEBUG': 'false'` and
`'process.env.NODE_ENV': JSON.stringify(...)`. `define` replaces the text at
build time so no bare `process` survives.

**Why:** react-dom's own `process` use is guarded by `typeof process ===
"object"`, so it's safe; only unguarded lib references need a define. Prefer
targeted per-key defines over `'process.env': {}`, which also blanks NODE_ENV
and can flip library dev/prod behavior.

**How to apply:** if a new dep triggers this error, grep the optimized dep
(`node_modules/.vite/deps/*.js`) for `process.env.` occurrences NOT preceded by
a `typeof process` guard, then add each key to `define`. Restart the stormraven
workflow afterward so Vite re-optimizes deps (a config change alone won't
re-run the cached optimize step reliably).
