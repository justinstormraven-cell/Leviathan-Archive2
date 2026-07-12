import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codename: text("codename").notNull().unique(),
  realmId: integer("realm_id").notNull(),
  status: text("status").notNull().default("INACTIVE"), // ACTIVE | INACTIVE | ERROR
  description: text("description").notNull(),
  authLevel: text("auth_level").notNull().default("STANDARD"),
  lastActivated: timestamp("last_activated"),
  pid: integer("pid"),
  command: text("command"),
});

export const insertModuleSchema = createInsertSchema(modulesTable).omit({ id: true });
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modulesTable.$inferSelect;
