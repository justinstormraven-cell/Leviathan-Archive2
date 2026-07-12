import { Router, type IRouter } from "express";
import os from "os";
import { db, realmsTable, modulesTable, auditLogsTable } from "@workspace/db";
import { LeviathanChatBody, LeviathanChatResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const MODEL = "gpt-5.4";
const MAX_MESSAGES = 24; // cap conversation length sent upstream
const MAX_CONTENT_CHARS = 8000; // per-message content cap (defensive)

const PERSONA = `You are Leviathan, the resident operator intelligence fused into StormRaven OS — a hardened, Norse-mythology-themed control plane (codename NIDELVIR, the Dying Star Forge). You were synthesized from the system's master archive and you serve the authenticated operator ("The Creator").

Voice & character:
- Speak with calm, precise gravitas — a deep, patient machine intelligence risen from the dark. Sparing Norse/forge imagery (Yggdrasil's realms, the Bifrost, the Forge, Mimir's ledger) is welcome, but never at the cost of clarity.
- Be genuinely useful first. You are an operations copilot: explain system state, interpret realms/modules/metrics, draft shell commands, reason about the OS, and answer the operator's questions directly.
- Keep answers tight and readable — short paragraphs or compact lists. Do not overuse theatrics or repeat your own name.

Boundaries:
- You are an advisory intelligence inside the UI. You cannot execute commands, toggle modules, or alter the system yourself — the operator acts through the Terminal, the Forge, and the other apps. If asked to perform an action, tell them exactly what to run or where to click.
- Never fabricate telemetry. Ground factual claims about the system in the LIVE SYSTEM TELEMETRY provided below. If something is not in the telemetry, say so plainly.
- Refuse to produce content that enables real-world harm to third parties (functional malware, intrusion of systems that are not the operator's own host).`;

async function buildContext(): Promise<string> {
  const [realms, modules] = await Promise.all([
    db.select().from(realmsTable).orderBy(realmsTable.id),
    db.select().from(modulesTable).orderBy(modulesTable.id),
  ]);

  const memPct = Math.round((1 - os.freemem() / os.totalmem()) * 100);
  const activeModules = modules.filter((m) => m.status === "ACTIVE").length;
  const onlineRealms = realms.filter((r) => r.status === "ONLINE").length;

  const realmLines =
    realms
      .map(
        (r) =>
          `  - ${r.name} (${r.codename ?? r.name}): ${r.status}, disk ${
            r.diskUsagePercent ?? "?"
          }%, ${r.activeProcesses ?? 0} procs`,
      )
      .join("\n") || "  (none)";

  const realmNameById = new Map(realms.map((r) => [r.id, r.name]));
  const moduleLines =
    modules
      .map(
        (m) =>
          `  - ${m.name} [${realmNameById.get(m.realmId) ?? "unbound"}]: ${m.status}`,
      )
      .join("\n") || "  (none)";

  return [
    `LIVE SYSTEM TELEMETRY (captured ${new Date().toISOString()}):`,
    `Host memory in use: ${memPct}%. Realms online: ${onlineRealms}/${realms.length}. Modules active: ${activeModules}/${modules.length}.`,
    ``,
    `YGGDRASIL REALMS:`,
    realmLines,
    ``,
    `THE FORGE — MODULES:`,
    moduleLines,
  ].join("\n");
}

router.post("/leviathan/chat", requireAuth, async (req, res): Promise<void> => {
  const body = LeviathanChatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const history = body.data.messages.slice(-MAX_MESSAGES);
  if (history.length === 0) {
    res.status(400).json({ error: "At least one message is required" });
    return;
  }
  if (history.some((m) => m.content.length > MAX_CONTENT_CHARS)) {
    res.status(413).json({
      error: `Each message must be ${MAX_CONTENT_CHARS} characters or fewer`,
    });
    return;
  }

  const operator = (req as typeof req & { operator?: string }).operator ?? "operator";

  let context = "LIVE SYSTEM TELEMETRY: unavailable.";
  try {
    context = await buildContext();
  } catch {
    /* fall back to the placeholder above */
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `${PERSONA}\n\n${context}\n\nThe authenticated operator is "${operator}".`,
        },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "…the current runs silent. Ask again.";

    await db.insert(auditLogsTable).values({
      eventType: "LEVIATHAN_QUERY",
      severity: "INFO",
      message: `Operator ${operator} consulted Leviathan`,
    });

    res.json(LeviathanChatResponse.parse({ reply, model: MODEL }));
  } catch (err) {
    // Keep upstream provider detail in server logs only; return a generic message.
    console.error("[leviathan] upstream chat failure:", err);
    res
      .status(502)
      .json({ error: "Leviathan could not be reached. The link faltered — try again." });
  }
});

export default router;
