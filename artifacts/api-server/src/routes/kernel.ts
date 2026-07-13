import { Router, type IRouter } from "express";
import { GetKernelLogResponse } from "@workspace/api-zod";
import { getKernelLog } from "../lib/kernel-log";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/kernel/log", requireAuth, async (_req, res): Promise<void> => {
  const log = await getKernelLog();
  res.json(GetKernelLogResponse.parse(log));
});

export default router;
