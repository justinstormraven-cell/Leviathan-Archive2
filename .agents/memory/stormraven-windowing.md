---
name: StormRaven desktop windowing constraints
description: How legacy pages and single-instance apps behave inside the desktop shell — pitfalls that look like bugs.
---

StormRaven's `App.tsx` always renders the desktop shell; the wouter `Router` is kept
only so legacy pages' `<Link>`s resolve. Legacy pages (Dashboard, Realms, etc.) are
**only ever rendered inside desktop windows**, never as standalone routes.

## Rule 1 — no wouter navigation inside pages
A wouter `<Link>`/`setLocation` inside a windowed page changes the URL but nothing
re-renders (the window is bound to a fixed app component, not the route), so the link
looks dead. Route to a window instead via `useDesktop().openApp(appId)`. Use the
`PageLink` component (maps routes→app ids) as a drop-in for `<Link>` in pages.
**Why:** it silently breaks navigation and looks like a glitch.

## Rule 2 — single-instance apps must react to payload changes
`openApp(id, payload)` reuses the existing window for single-instance apps and just
updates its `payload`; the component does **not** remount. Any app that seeds internal
state from `win.payload` on mount (e.g. TextEditor's file path) will ignore a new
payload. Fix by keying the inner component on the payload value so it remounts, or by
syncing via effect.
**How to apply:** whenever an app can be re-opened with different `payload` while
already open, verify the new payload actually takes effect.
