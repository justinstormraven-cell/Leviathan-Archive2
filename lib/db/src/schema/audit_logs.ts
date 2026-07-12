import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("INFO"), // INFO | WARN | CRITICAL | SUCCESS
  message: text("message").notNull(),
  realmId: integer("realm_id"),
  moduleId: integer("module_id"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
