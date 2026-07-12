import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const RAW_SECRET = process.env.SESSION_SECRET;
if (!RAW_SECRET) {
  throw new Error(
    "SESSION_SECRET is required to sign operator tokens. Refusing to start without it.",
  );
}
const SECRET: string = RAW_SECRET;
export const OPERATOR_NAME = "Leviathan";
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function signToken(operator: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { sub: operator, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): { operator: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { operator: payload.sub };
  } catch {
    return null;
  }
}

/** Whether a terminal password has been configured on the server. */
export function isPasswordConfigured(): boolean {
  return Boolean(process.env.STORMRAVEN_PASSWORD);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.STORMRAVEN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqualStr(password, expected);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const result = verifyToken(header.slice(7));
  if (!result) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }
  (req as Request & { operator?: string }).operator = result.operator;
  next();
}
