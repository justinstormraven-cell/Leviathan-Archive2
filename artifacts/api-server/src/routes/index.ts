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
import replitAuthRouter from "./replitAuth";
import roeRouter from "./roe";
import integrityRouter from "./integrity";
import incidentsRouter from "./incidents";
import defenseRouter from "./defense";
import complianceRouter from "./compliance";
import { requireAuth } from "../lib/auth";
import { requireRoeAccepted } from "../lib/roe";

const router: IRouter = Router();

// Privileged tooling requires an authenticated operator who has ALSO accepted
// the current Rules of Engagement. Enforced server-side (not just in the UI) so
// a valid token alone cannot invoke dangerous or mutating APIs.
const roeGate = [requireAuth, requireRoeAccepted] as const;

router.use(healthRouter);
router.use(authRouter);
router.use(systemRouter);
router.use(realmsRouter);
router.use(auditRouter);
router.use(replitAuthRouter);
router.use(roeRouter);
// Read-only defensive dashboards stay behind requireAuth (applied per-route) so
// the posture/compliance views remain reachable to report on RoE state itself.
router.use(defenseRouter);
router.use(complianceRouter);

// RoE-gated operator tooling and mutating defensive operations.
router.use(...roeGate, modulesRouter);
router.use(...roeGate, kernelRouter);
router.use(...roeGate, terminalRouter);
router.use(...roeGate, fsRouter);
router.use(...roeGate, monitorRouter);
router.use(...roeGate, packagesRouter);
router.use(...roeGate, leviathanRouter);
router.use(...roeGate, integrityRouter);
router.use(...roeGate, incidentsRouter);

export default router;
