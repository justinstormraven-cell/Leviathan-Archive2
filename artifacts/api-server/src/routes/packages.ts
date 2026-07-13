import { Router, type IRouter } from "express";
import { GetPackagesResponse } from "@workspace/api-zod";
import { getPackageList } from "../lib/package-catalog";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/packages", requireAuth, async (_req, res): Promise<void> => {
  const list = await getPackageList();
  res.json(GetPackagesResponse.parse(list));
});

export default router;
