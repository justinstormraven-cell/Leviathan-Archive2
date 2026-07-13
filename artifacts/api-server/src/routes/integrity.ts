import { Router, type IRouter, type Request } from "express";
import { db, integrityBaselinesTable, integrityAlertsTable, auditLogsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import {
  GetIntegrityStatusResponse,
  GetIntegrityBaselinesResponse,
  CaptureIntegrityBaselineResponse,
  RunIntegrityScanResponse,
  GetIntegrityAlertsResponse,
  UpdateIntegrityAlertBody,
  UpdateIntegrityAlertResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { WATCHED_PATHS, fingerprint } from "../lib/integrity";

const router: IRouter = Router();

function operatorOf(req: Request): string {
  return (req as Request & { operator?: string }).operator ?? "unknown";
}

// Heimdallr status overview.
router.get("/integrity/status", requireAuth, async (_req, res): Promise<void> => {
  const [bl] = await db.select({ count: sql<number>`count(*)::int` }).from(integrityBaselinesTable);
  const [openAlerts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityAlertsTable)
    .where(eq(integrityAlertsTable.status, "OPEN"));
  const [lastBaseline] = await db
    .select({ updatedAt: integrityBaselinesTable.updatedAt })
    .from(integrityBaselinesTable)
    .orderBy(desc(integrityBaselinesTable.updatedAt))
    .limit(1);

  res.json(
    GetIntegrityStatusResponse.parse({
      watched: WATCHED_PATHS.length,
      baselined: bl?.count ?? 0,
      openAlerts: openAlerts?.count ?? 0,
      monitoring: (bl?.count ?? 0) > 0,
      lastBaselineAt: lastBaseline ? lastBaseline.updatedAt.toISOString() : null,
    }),
  );
});

// List baselines with live presence status.
router.get("/integrity/baselines", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(integrityBaselinesTable).orderBy(integrityBaselinesTable.path);
  const baselined = new Set(rows.map((r) => r.path));

  const items = rows.map((r) => ({
    id: r.id,
    path: r.path,
    hash: r.hash,
    sizeBytes: r.sizeBytes,
    updatedAt: r.updatedAt.toISOString(),
  }));

  // Surface watched paths that have never been baselined.
  const pending = WATCHED_PATHS.filter((p) => !baselined.has(p)).map((p) => ({
    id: 0,
    path: p,
    hash: "",
    sizeBytes: 0,
    updatedAt: null,
  }));

  res.json(GetIntegrityBaselinesResponse.parse({ baselines: items, pending }));
});

// Establish / refresh the baseline for every watched path.
router.post("/integrity/baseline", requireAuth, async (req, res): Promise<void> => {
  let count = 0;
  for (const path of WATCHED_PATHS) {
    const fp = await fingerprint(path);
    if (fp.hash === null) continue; // skip missing files
    await db
      .insert(integrityBaselinesTable)
      .values({ path, hash: fp.hash, sizeBytes: fp.sizeBytes, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: integrityBaselinesTable.path,
        set: { hash: fp.hash, sizeBytes: fp.sizeBytes, updatedAt: new Date() },
      });
    count += 1;
  }

  await db.insert(auditLogsTable).values({
    eventType: "INTEGRITY_BASELINE",
    severity: "INFO",
    message: `Operator ${operatorOf(req)} captured integrity baseline for ${count} file(s)`,
  });

  res.json(CaptureIntegrityBaselineResponse.parse({ checked: count, alerts: [] }));
});

// Scan watched paths against the baseline and raise alerts on deviation.
router.post("/integrity/scan", requireAuth, async (req, res): Promise<void> => {
  const baselines = await db.select().from(integrityBaselinesTable);
  const newAlerts: (typeof integrityAlertsTable.$inferSelect)[] = [];

  for (const base of baselines) {
    const fp = await fingerprint(base.path);
    let changeType: string | null = null;
    if (fp.hash === null) changeType = "DELETED";
    else if (fp.hash !== base.hash) changeType = "MODIFIED";
    if (!changeType) continue;

    const [alert] = await db
      .insert(integrityAlertsTable)
      .values({
        path: base.path,
        changeType,
        expectedHash: base.hash,
        actualHash: fp.hash,
        severity: "CRITICAL",
        status: "OPEN",
      })
      .returning();
    newAlerts.push(alert);
  }

  await db.insert(auditLogsTable).values({
    eventType: "INTEGRITY_SCAN",
    severity: newAlerts.length > 0 ? "CRITICAL" : "INFO",
    message:
      newAlerts.length > 0
        ? `Heimdallr detected ${newAlerts.length} integrity deviation(s)`
        : `Heimdallr scan clean across ${baselines.length} watched file(s)`,
  });

  res.json(
    RunIntegrityScanResponse.parse({
      checked: baselines.length,
      alerts: newAlerts.map((a) => ({
        id: a.id,
        timestamp: a.timestamp.toISOString(),
        path: a.path,
        changeType: a.changeType,
        expectedHash: a.expectedHash,
        actualHash: a.actualHash,
        severity: a.severity,
        status: a.status,
      })),
    }),
  );
});

// List integrity alerts.
router.get("/integrity/alerts", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(integrityAlertsTable)
    .orderBy(desc(integrityAlertsTable.timestamp))
    .limit(100);
  res.json(
    GetIntegrityAlertsResponse.parse(
      rows.map((a) => ({
        id: a.id,
        timestamp: a.timestamp.toISOString(),
        path: a.path,
        changeType: a.changeType,
        expectedHash: a.expectedHash,
        actualHash: a.actualHash,
        severity: a.severity,
        status: a.status,
      })),
    ),
  );
});

// Resolve an integrity alert.
router.patch("/integrity/alerts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }
  const parsed = UpdateIntegrityAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(integrityAlertsTable)
    .set({ status: parsed.data.status })
    .where(eq(integrityAlertsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    eventType: "INTEGRITY_ALERT_UPDATE",
    severity: "INFO",
    message: `Operator ${operatorOf(req)} set integrity alert #${id} to ${parsed.data.status}`,
  });

  res.json(
    UpdateIntegrityAlertResponse.parse({
      id: updated.id,
      timestamp: updated.timestamp.toISOString(),
      path: updated.path,
      changeType: updated.changeType,
      expectedHash: updated.expectedHash,
      actualHash: updated.actualHash,
      severity: updated.severity,
      status: updated.status,
    }),
  );
});

export default router;
