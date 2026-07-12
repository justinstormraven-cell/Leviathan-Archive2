---
name: StormRaven AI / Leviathan integration
description: How AI chat features are wired into StormRaven and the constraints that shaped the design.
---

# AI features in StormRaven

AI capability (the "Leviathan" operator-intelligence chat app) runs through the
**Replit-managed OpenAI integration** (`lib/integrations-openai-ai-server`, provisioned via
`setupReplitAIIntegrations({ providerSlug: "openai" })`). No user API key — usage is billed to
the user's Replit credits, so the UI must state that on first use.

**Model call convention:** `openai.chat.completions.create({ model: "gpt-5.4",
max_completion_tokens: 8192, messages })`. Do **not** pass `temperature` or `max_tokens` — the
managed gpt-5.x models reject them.

## Why the chat endpoint is non-streaming JSON
StormRaven's client hooks are orval-generated from `lib/api-spec/openapi.yaml`. **Orval cannot
generate hooks for SSE/streaming responses** — only request-body zod + JSON responses get
generated types/hooks. So AI endpoints are modeled as plain `POST … -> { reply }` JSON so the
frontend gets a real `use<OpName>` mutation hook. Trade-off: no token streaming; acceptable here.

**How to apply:** to add another AI endpoint, add path + schemas to openapi.yaml, run
`pnpm --filter @workspace/api-spec run codegen`, then implement the route. Operation id
`leviathanChat` → generated `LeviathanChatBody` / `LeviathanChatResponse` zod + `useLeviathanChat`.

## Grounding & safety pattern
The route injects live telemetry (queries `realmsTable`/`modulesTable`, host memory) into the
system prompt so replies are grounded, not hallucinated. It is `requireAuth`-gated (operator
only), caps per-message length + history window server-side, logs an audit row without storing
chat content, and returns a **generic** upstream-failure message (provider error detail stays in
server logs only). Conversation history is client-side/ephemeral — no DB persistence by design.
