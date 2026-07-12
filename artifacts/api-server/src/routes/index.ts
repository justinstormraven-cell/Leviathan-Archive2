import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import systemRouter from "./system";
import realmsRouter from "./realms";
import modulesRouter from "./modules";
import auditRouter from "./audit";
import terminalRouter from "./terminal";
import kernelRouter from "./kernel";
import fsRouter from "./fs";
import monitorRouter from "./monitor";
import packagesRouter from "./packages";
import leviathanRouter from "./leviathan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(systemRouter);
router.use(realmsRouter);
router.use(modulesRouter);
router.use(auditRouter);
router.use(kernelRouter);
router.use(terminalRouter);
router.use(fsRouter);
router.use(monitorRouter);
router.use(packagesRouter);
router.use(leviathanRouter);

export default router;
