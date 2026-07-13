import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Valkyrie incident response ledger — structured security incidents with a
// severity, lifecycle status, and an acknowledge/resolve workflow.
export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("GENERAL"),
  severity: text("severity").notNull().default("MEDIUM"), // LOW | MEDIUM | HIGH | CRITICAL
  status: text("status").notNull().default("OPEN"), // OPEN | ACKNOWLEDGED | RESOLVED
  source: text("source").notNull().default("MANUAL"), // MANUAL | ANOMALY | INTEGRITY
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolution: text("resolution"),
});

export type Incident = typeof incidentsTable.$inferSelect;
