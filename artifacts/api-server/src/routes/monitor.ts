import { Router, type IRouter } from "express";
import { GetProcessesResponse } from "@workspace/api-zod";
import { getProcessList } from "../lib/process-list";

const router: IRouter = Router();

router.get("/system/processes", async (_req, res): Promise<void> => {
  const list = await getProcessList();
  res.json(GetProcessesResponse.parse(list));
});

export default router;
