import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// Heimdallr file-integrity baselines — the trusted SHA-256 fingerprint of each
// watched path, captured when the operator establishes a baseline. Deviations
// from these values are surfaced as integrity alerts.
export const integrityBaselinesTable = pgTable("integrity_baselines", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  hash: text("hash").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type IntegrityBaseline = typeof integrityBaselinesTable.$inferSelect;
