import { Router, type IRouter, type Request } from "express";
import { db, incidentsTable, auditLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  GetIncidentsResponse,
  CreateIncidentBody,
  CreateIncidentResponse,
  UpdateIncidentBody,
  UpdateIncidentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function operatorOf(req: Request): string {
  return (req as Request & { operator?: string }).operator ?? "unknown";
}

function serialize(i: typeof incidentsTable.$inferSelect) {
  return {
    id: i.id,
    timestamp: i.timestamp.toISOString(),
    title: i.title,
    description: i.description,
    category: i.category,
    severity: i.severity,
    status: i.status,
    source: i.source,
    acknowledgedAt: i.acknowledgedAt ? i.acknowledgedAt.toISOString() : null,
    acknowledgedBy: i.acknowledgedBy ?? null,
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
    resolvedBy: i.resolvedBy ?? null,
    resolution: i.resolution ?? null,
  };
}

// List incidents (newest first).
router.get("/incidents", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(incidentsTable)
    .orderBy(desc(incidentsTable.timestamp))
    .limit(100);
  res.json(GetIncidentsResponse.parse(rows.map(serialize)));
});

// Open a new incident.
router.post("/incidents", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, description, category, severity } = parsed.data;

  const [row] = await db
    .insert(incidentsTable)
    .values({
      title,
      description: description ?? "",
      category: category ?? "GENERAL",
      severity: severity ?? "MEDIUM",
      status: "OPEN",
      source: "MANUAL",
    })
    .returning();

  await db.insert(auditLogsTable).values({
    eventType: "INCIDENT_OPENED",
    severity: severity === "CRITICAL" || severity === "HIGH" ? "CRITICAL" : "WARN",
    message: `Operator ${operatorOf(req)} opened incident "${title}" (${severity ?? "MEDIUM"})`,
  });

  res.json(CreateIncidentResponse.parse(serialize(row)));
});

// Acknowledge or resolve an incident.
router.patch("/incidents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid incident id" });
    return;
  }
  const parsed = UpdateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operator = operatorOf(req);
  const now = new Date();
  const patch: Partial<typeof incidentsTable.$inferInsert> = { status: parsed.data.status };
  if (parsed.data.status === "ACKNOWLEDGED") {
    patch.acknowledgedAt = now;
    patch.acknowledgedBy = operator;
  } else if (parsed.data.status === "RESOLVED") {
    patch.resolvedAt = now;
    patch.resolvedBy = operator;
    if (parsed.data.resolution) patch.resolution = parsed.data.resolution;
  }

  const [updated] = await db
    .update(incidentsTable)
    .set(patch)
    .where(eq(incidentsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    eventType: "INCIDENT_UPDATE",
    severity: "INFO",
    message: `Operator ${operator} set incident #${id} to ${parsed.data.status}`,
  });

  res.json(UpdateIncidentResponse.parse(serialize(updated)));
});

export default router;
