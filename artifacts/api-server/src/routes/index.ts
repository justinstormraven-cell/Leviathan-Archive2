import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import systemRouter from "./system";
import realmsRouter from "./realms";
import modulesRouter from "./modules";
import auditRouter from "./audit";
import terminalRouter from "./terminal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(systemRouter);
router.use(realmsRouter);
router.use(modulesRouter);
router.use(auditRouter);
router.use(terminalRouter);

export default router;
