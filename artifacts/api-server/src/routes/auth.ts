import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, GetAuthStatusResponse } from "@workspace/api-zod";
import { db, auditLogsTable } from "@workspace/db";
import {
  checkPassword,
  isPasswordConfigured,
  signToken,
  requireAuth,
  OPERATOR_NAME,
} from "../lib/auth";
import { rateLimit } from "../lib/rateLimit";

const router: IRouter = Router();

// Throttle login attempts per client IP to prevent password brute-forcing.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many login attempts. Please wait before trying again.",
});

router.post("/auth/login", loginRateLimit, async (req, res): Promise<void> => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A password is required" });
    return;
  }

  if (!isPasswordConfigured()) {
    res.status(503).json({
      error: "Terminal access is not configured. No operator password has been set on the server.",
    });
    return;
  }

  if (!checkPassword(body.data.password)) {
    await db.insert(auditLogsTable).values({
      eventType: "AUTH_FAILURE",
      severity: "WARN",
      message: "Rejected terminal authentication attempt (invalid password)",
    });
    res.status(401).json({ error: "Access denied. Invalid operator credentials." });
    return;
  }

  const token = signToken(OPERATOR_NAME);
  await db.insert(auditLogsTable).values({
    eventType: "AUTH_SUCCESS",
    severity: "INFO",
    message: `Operator ${OPERATOR_NAME} authenticated to the live shell`,
  });

  res.json(LoginResponse.parse({ token, operator: OPERATOR_NAME }));
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const operator = (req as typeof req & { operator?: string }).operator ?? OPERATOR_NAME;
  res.json(GetAuthStatusResponse.parse({ authenticated: true, operator }));
});

export default router;
