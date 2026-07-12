import { Router, type IRouter } from "express";
import { GetKernelLogResponse } from "@workspace/api-zod";
import { getKernelLog } from "../lib/kernel-log";

const router: IRouter = Router();

router.get("/kernel/log", async (_req, res): Promise<void> => {
  const log = await getKernelLog();
  res.json(GetKernelLogResponse.parse(log));
});

export default router;
