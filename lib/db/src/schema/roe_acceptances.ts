import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

// Rules of Engagement acceptances — the ethical-hacking authorization record.
// Every operator must acknowledge the current RoE version and the authorized
// scope before operating the defensive tooling. Each acceptance is immutable.
export const roeAcceptancesTable = pgTable("roe_acceptances", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  operator: text("operator").notNull(),
  roeVersion: text("roe_version").notNull(),
  scopeAcknowledged: boolean("scope_acknowledged").notNull().default(false),
  authorizedScope: text("authorized_scope").notNull().default(""),
  ipAddress: text("ip_address"),
});

export type RoeAcceptance = typeof roeAcceptancesTable.$inferSelect;
