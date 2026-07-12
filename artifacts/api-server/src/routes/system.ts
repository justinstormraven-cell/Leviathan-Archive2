import { Router, type IRouter } from "express";
import os from "os";
import { db, modulesTable, realmsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GetSystemMetricsResponse } from "@workspace/api-zod";
import { getCpuPercent } from "../lib/system-metrics";

const router: IRouter = Router();

router.get("/system/metrics", async (_req, res): Promise<void> => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const cpuPercent = await getCpuPercent();
  const uptimeSeconds = Math.floor(os.uptime());

  const [activeModulesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(modulesTable)
    .where(eq(modulesTable.status, "ACTIVE"));

  const [totalModulesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(modulesTable);

  const [activeRealmsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(realmsTable)
    .where(eq(realmsTable.status, "ONLINE"));

  const activeModules = activeModulesRow?.count ?? 0;
  const totalModules = totalModulesRow?.count ?? 0;
  const activeRealms = activeRealmsRow?.count ?? 0;

  let threatLevel = "NOMINAL";
  if (memPercent > 85 || cpuPercent > 90) threatLevel = "ELEVATED";
  if (activeRealms < 2) threatLevel = "CRITICAL";

  const metrics = GetSystemMetricsResponse.parse({
    memoryPercent: memPercent,
    cpuPercent,
    uptimeSeconds,
    activeModules,
    totalModules,
    threatLevel,
    activeRealms,
    authLevel: "ALLFATHER_ROOT",
  });

  res.json(metrics);
});

export default router;
