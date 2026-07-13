import { Router, type IRouter, type Request } from "express";
import { db, roeAcceptancesTable, auditLogsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { GetRoeStatusResponse, AcceptRoeBody, AcceptRoeResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { ROE_VERSION, ETHICAL_HACKING_LAWS, DEFAULT_AUTHORIZED_SCOPE } from "../lib/roe";

const router: IRouter = Router();

function operatorOf(req: Request): string {
  return (req as Request & { operator?: string }).operator ?? "unknown";
}

// Current RoE and whether THIS operator has accepted this version.
router.get("/roe/status", requireAuth, async (req, res): Promise<void> => {
  const operator = operatorOf(req);
  const [latest] = await db
    .select()
    .from(roeAcceptancesTable)
    .where(
      and(
        eq(roeAcceptancesTable.operator, operator),
        eq(roeAcceptancesTable.roeVersion, ROE_VERSION),
      ),
    )
    .orderBy(desc(roeAcceptancesTable.timestamp))
    .limit(1);

  res.json(
    GetRoeStatusResponse.parse({
      version: ROE_VERSION,
      accepted: Boolean(latest),
      acceptedAt: latest ? latest.timestamp.toISOString() : null,
      operator: latest?.operator ?? null,
      authorizedScope: latest?.authorizedScope ?? DEFAULT_AUTHORIZED_SCOPE,
      defaultScope: DEFAULT_AUTHORIZED_SCOPE,
      laws: ETHICAL_HACKING_LAWS,
    }),
  );
});

// Record acceptance of the Rules of Engagement.
router.post("/roe/accept", requireAuth, async (req, res): Promise<void> => {
  const parsed = AcceptRoeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.scopeAcknowledged) {
    res.status(400).json({ error: "The authorized scope must be acknowledged to proceed." });
    return;
  }

  const operator = operatorOf(req);
  const authorizedScope = parsed.data.authorizedScope?.trim() || DEFAULT_AUTHORIZED_SCOPE;
  const ipAddress =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  const [row] = await db
    .insert(roeAcceptancesTable)
    .values({
      operator,
      roeVersion: ROE_VERSION,
      scopeAcknowledged: true,
      authorizedScope,
      ipAddress,
    })
    .returning();

  await db.insert(auditLogsTable).values({
    eventType: "ROE_ACCEPTED",
    severity: "SUCCESS",
    message: `Operator ${operator} accepted Rules of Engagement v${ROE_VERSION} (scope: ${authorizedScope})`,
  });

  res.json(
    AcceptRoeResponse.parse({
      version: ROE_VERSION,
      accepted: true,
      acceptedAt: row.timestamp.toISOString(),
      operator,
      authorizedScope,
    }),
  );
});

export default router;
