---
name: StormRaven filesystem sandbox
description: The /api/fs/* explorer is confined to a single root; how the confinement works and why it must not be loosened.
---

# StormRaven: filesystem access is sandboxed

The `/api/fs/list|read|write` endpoints (backed by `fs-explorer.ts`) must never
expose the whole host filesystem, even to an authenticated operator. All access
is confined to `FS_ROOT` (default `/home/runner/workspace`, overridable via the
`FS_ROOT` env var).

## The rule
- `resolvePath` resolves every request against `FS_ROOT` and rejects anything
  that escapes it (lexical check via `path.relative`).
- Filesystem-touching calls additionally resolve the **realpath** and re-check
  containment, so a symlink inside the workspace pointing at `/etc/passwd`
  cannot be used to escape. For writes to new files, the parent dir's realpath
  is bounds-checked.
- Out-of-root access returns `EACCES` ("Path is outside the permitted workspace
  root"). Quick links only point inside the root.

**Why:** a security review found unrestricted read/write let an operator read
`/etc/shadow`, secrets, SSH keys, and overwrite any writable file — full host
compromise on top of the already-real terminal. Requiring auth was not enough;
the path itself had to be bounded.

## How to apply
Do not add filesystem endpoints or quick links that reach outside `FS_ROOT`,
and do not drop the realpath re-check — the lexical check alone is bypassable
via symlinks.
