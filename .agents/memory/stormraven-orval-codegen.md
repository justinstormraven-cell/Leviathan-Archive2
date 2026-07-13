---
name: orval codegen naming (StormRaven)
description: How generated zod/type exports are named and how to type responses in the web app
---

# orval codegen naming

The api-spec codegen (`pnpm run codegen`) generates zod schemas and TS types keyed
**per operationId**, not per component schema. For an operation `getComplianceReport`
you get exports like `GetComplianceReportResponse` (zod, in `@workspace/api-zod`) and
the React Query hook `useGetComplianceReport` (in `@workspace/api-client-react`).

**Rule:** to type a response object in the web app, import the shared MODEL type
directly (e.g. `import { type ComplianceReport } from "@workspace/api-client-react"`).

**Do NOT** derive it via `NonNullable<ReturnType<typeof useGetX>["data"]>` — the hook is
generic and TS infers `data` as `{}`, producing a cascade of "Property X does not exist
on type '{}'" errors.

**Why:** hit exactly this on the compliance page — ReturnType inference collapsed the
response to `{}`. Switching to the exported model type fixed it cleanly.
