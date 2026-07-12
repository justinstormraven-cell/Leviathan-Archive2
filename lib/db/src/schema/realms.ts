import { pgTable, serial, text, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const realmsTable = pgTable("realms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codename: text("codename").notNull().unique(),
  status: text("status").notNull().default("ONLINE"), // ONLINE | OFFLINE | DEGRADED | CRITICAL
  description: text("description").notNull(),
  mountPath: text("mount_path").notNull(),
  diskUsagePercent: real("disk_usage_percent"),
  activeProcesses: integer("active_processes"),
});

export const insertRealmSchema = createInsertSchema(realmsTable).omit({ id: true });
export type InsertRealm = z.infer<typeof insertRealmSchema>;
export type Realm = typeof realmsTable.$inferSelect;
