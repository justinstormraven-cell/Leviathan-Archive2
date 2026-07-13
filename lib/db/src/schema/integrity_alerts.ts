import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Heimdallr integrity alerts — raised when a watched path deviates from its
// established baseline (content modified, file deleted, or a new file appeared).
export const integrityAlertsTable = pgTable("integrity_alerts", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  path: text("path").notNull(),
  changeType: text("change_type").notNull(), // MODIFIED | DELETED | ADDED
  expectedHash: text("expected_hash"),
  actualHash: text("actual_hash"),
  severity: text("severity").notNull().default("WARN"), // INFO | WARN | CRITICAL
  status: text("status").notNull().default("OPEN"), // OPEN | RESOLVED
});

export type IntegrityAlert = typeof integrityAlertsTable.$inferSelect;
