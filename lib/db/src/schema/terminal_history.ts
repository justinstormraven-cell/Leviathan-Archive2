import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const terminalHistoryTable = pgTable("terminal_history", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(),
  output: text("output").notNull(),
  exitCode: integer("exit_code").notNull().default(0),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

export const insertTerminalHistorySchema = createInsertSchema(terminalHistoryTable).omit({ id: true });
export type InsertTerminalHistory = z.infer<typeof insertTerminalHistorySchema>;
export type TerminalHistory = typeof terminalHistoryTable.$inferSelect;
