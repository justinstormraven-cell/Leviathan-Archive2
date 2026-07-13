// Rules of Engagement — the ethical-hacking authorization contract every
// operator must accept before running StormRaven's defensive tooling.

import type { Request, Response, NextFunction } from "express";
import { db, roeAcceptancesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const ROE_VERSION = "1.0.0";

// The codified laws of ethical hacking presented at the authorization gate.
export const ETHICAL_HACKING_LAWS: string[] = [
  "Authorization first — operate only with explicit, documented permission from the system owner.",
  "Stay in scope — never touch systems, networks, or data outside the sanctioned boundary.",
  "Do no harm — do not degrade, destroy, or disrupt services beyond what the engagement requires.",
  "Protect data — preserve confidentiality; never exfiltrate or retain data beyond the engagement.",
  "Full accountability — log every action so the engagement is transparent and reproducible.",
  "Responsible disclosure — report every finding to the owner; never weaponize or sell it.",
  "Respect privacy and law — comply with all applicable law and the rights of individuals.",
  "Leave no trace — remove tooling and persistent access; restore systems to their original state.",
];

export const DEFAULT_AUTHORIZED_SCOPE =
  "StormRaven OS host environment only. No third-party, external, or production systems.";

/** Whether the given operator has accepted the current RoE version. */
export async function hasAcceptedRoe(operator: string): Promise<boolean> {
  const [row] = await db
    .select({ id: roeAcceptancesTable.id })
    .from(roeAcceptancesTable)
    .where(
      and(
        eq(roeAcceptancesTable.operator, operator),
        eq(roeAcceptancesTable.roeVersion, ROE_VERSION),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Server-side enforcement of the Rules of Engagement. Must run AFTER
 * `requireAuth` so the authenticated operator is available on the request.
 * Blocks privileged tooling until the operator has accepted the current RoE,
 * closing the gap where a valid token alone could invoke dangerous APIs.
 */
export async function requireRoeAccepted(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const operator = (req as Request & { operator?: string }).operator;
  if (!operator) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!(await hasAcceptedRoe(operator))) {
    res.status(403).json({
      error: "Rules of Engagement not accepted",
      code: "ROE_REQUIRED",
      roeVersion: ROE_VERSION,
    });
    return;
  }
  next();
}
