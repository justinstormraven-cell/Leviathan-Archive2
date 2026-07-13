import { Router, type IRouter } from "express";
import {
  db,
  roeAcceptancesTable,
  auditLogsTable,
  incidentsTable,
  integrityBaselinesTable,
  integrityAlertsTable,
} from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { GetComplianceReportResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { ROE_VERSION, ETHICAL_HACKING_LAWS } from "../lib/roe";
import { computePosture } from "../lib/defense";

const router: IRouter = Router();

// Exportable ethics / compliance report aggregating the full accountability trail.
router.get("/compliance/report", requireAuth, async (_req, res): Promise<void> => {
  const acceptances = await db
    .select()
    .from(roeAcceptancesTable)
    .orderBy(desc(roeAcceptancesTable.timestamp))
    .limit(50);

  const severityRows = await db
    .select({ severity: auditLogsTable.severity, count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .groupBy(auditLogsTable.severity);
  const [totalAuditRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable);

  const statusRows = await db
    .select({ status: incidentsTable.status, count: sql<number>`count(*)::int` })
    .from(incidentsTable)
    .groupBy(incidentsTable.status);
  const [totalIncRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(incidentsTable);

  const [baselinedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityBaselinesTable);
  const [openAlertRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityAlertsTable)
    .where(eq(integrityAlertsTable.status, "OPEN"));

  const posture = await computePosture();

  const incidentsByStatus: Record<string, number> = {};
  for (const r of statusRows) incidentsByStatus[r.status] = r.count;
  const auditBySeverity: Record<string, number> = {};
  for (const r of severityRows) auditBySeverity[r.severity] = r.count;

  res.json(
    GetComplianceReportResponse.parse({
      generatedAt: new Date().toISOString(),
      roeVersion: ROE_VERSION,
      laws: ETHICAL_HACKING_LAWS,
      acceptances: acceptances.map((a) => ({
        id: a.id,
        timestamp: a.timestamp.toISOString(),
        operator: a.operator,
        roeVersion: a.roeVersion,
        authorizedScope: a.authorizedScope,
        ipAddress: a.ipAddress ?? null,
      })),
      audit: {
        total: totalAuditRow?.count ?? 0,
        info: auditBySeverity["INFO"] ?? 0,
        success: auditBySeverity["SUCCESS"] ?? 0,
        warn: auditBySeverity["WARN"] ?? 0,
        critical: auditBySeverity["CRITICAL"] ?? 0,
      },
      incidents: {
        total: totalIncRow?.count ?? 0,
        open: incidentsByStatus["OPEN"] ?? 0,
        acknowledged: incidentsByStatus["ACKNOWLEDGED"] ?? 0,
        resolved: incidentsByStatus["RESOLVED"] ?? 0,
      },
      integrity: {
        baselined: baselinedRow?.count ?? 0,
        openAlerts: openAlertRow?.count ?? 0,
      },
      posture: {
        score: posture.score,
        status: posture.status,
        threatLevel: posture.threatLevel,
      },
    }),
  );
});

export default router;
