import { Router, type IRouter } from "express";
import { db, auditLogsTable, realmsTable, modulesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetAuditLogsQueryParams, GetAuditLogsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const queryParsed = GetAuditLogsQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const { limit = 50, severity } = queryParsed.data;

  let query = db
    .select({
      id: auditLogsTable.id,
      timestamp: auditLogsTable.timestamp,
      eventType: auditLogsTable.eventType,
      severity: auditLogsTable.severity,
      message: auditLogsTable.message,
      realmName: realmsTable.name,
      moduleName: modulesTable.name,
    })
    .from(auditLogsTable)
    .leftJoin(realmsTable, eq(auditLogsTable.realmId, realmsTable.id))
    .leftJoin(modulesTable, eq(auditLogsTable.moduleId, modulesTable.id))
    .orderBy(desc(auditLogsTable.timestamp))
    .$dynamic();

  if (severity) {
    query = query.where(eq(auditLogsTable.severity, severity));
  }

  const rows = await query.limit(limit ?? 50);

  const mapped = rows.map((r) => ({
    ...r,
    timestamp: r.timestamp.toISOString(),
    realmName: r.realmName ?? null,
    moduleName: r.moduleName ?? null,
  }));

  res.json(GetAuditLogsResponse.parse(mapped));
});

export default router;
