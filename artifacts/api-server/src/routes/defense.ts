import { Router, type IRouter } from "express";
import { GetAnomaliesResponse, GetPostureResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { computeAnomalies, computePosture, threatFromAnomalies, getActiveRealms } from "../lib/defense";
import os from "os";
import { getCpuPercent } from "../lib/system-metrics";

const router: IRouter = Router();

// Intrusion / anomaly detection feed.
router.get("/defense/anomalies", requireAuth, async (_req, res): Promise<void> => {
  const anomalies = await computeAnomalies();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const cpuPercent = await getCpuPercent();
  const activeRealms = await getActiveRealms();
  const threatLevel = threatFromAnomalies(anomalies, { memPercent, cpuPercent, activeRealms });

  res.json(
    GetAnomaliesResponse.parse({
      threatLevel,
      total: anomalies.length,
      critical: anomalies.filter((a) => a.severity === "CRITICAL").length,
      anomalies,
    }),
  );
});

// Overall defensive posture.
router.get("/defense/posture", requireAuth, async (req, res): Promise<void> => {
  const operator = (req as typeof req & { operator?: string }).operator;
  const posture = await computePosture(operator);
  res.json(GetPostureResponse.parse(posture));
});

export default router;
