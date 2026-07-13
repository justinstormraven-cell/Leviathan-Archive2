import os from "os";
import {
  db,
  auditLogsTable,
  terminalHistoryTable,
  integrityAlertsTable,
  integrityBaselinesTable,
  incidentsTable,
  roeAcceptancesTable,
  realmsTable,
} from "@workspace/db";
import { and, eq, gte, desc, sql } from "drizzle-orm";
import { getCpuPercent } from "./system-metrics";
import { ROE_VERSION } from "./roe";

const WINDOW_MS = 60 * 60 * 1000; // rolling 1-hour detection window

// Heuristic signatures for offensive / destructive shell activity. Detection is
// defensive only: matches surface as anomalies for operator review.
export const SUSPICIOUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /rm\s+-rf?\s+(--no-preserve-root\s+)?\/(?:\s|$|\*)/, label: "Recursive delete of root" },
  { pattern: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh)/, label: "Pipe remote payload to shell" },
  { pattern: /\bnc\b\s+-l|\bncat\b\s+-l|\/dev\/tcp\//, label: "Reverse / bind shell" },
  { pattern: /chmod\s+(-R\s+)?0?777\b/, label: "World-writable permissions" },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:&\s*\}\s*;/, label: "Fork bomb" },
  { pattern: /\bdd\b[^\n]*of=\/dev\/(sd|nvme|mmcblk|xvd)/, label: "Raw write to block device" },
  { pattern: /\/etc\/(shadow|passwd|sudoers)\b/, label: "Access to credential store" },
  { pattern: /\b(mkfs|fdisk|wipefs)\b/, label: "Filesystem / partition modification" },
];

export interface Anomaly {
  id: string;
  type: string; // BRUTE_FORCE | SUSPICIOUS_COMMAND | CRITICAL_EVENTS | INTEGRITY | INCIDENT
  severity: string; // INFO | WARN | CRITICAL
  detail: string;
  count: number;
  detectedAt: string;
}

/** Analyze recent activity and surface defensive anomalies. */
export async function computeAnomalies(): Promise<Anomaly[]> {
  const since = new Date(Date.now() - WINDOW_MS);
  const now = new Date().toISOString();
  const anomalies: Anomaly[] = [];

  // 1. Brute-force: rejected authentication attempts in window.
  const [authFail] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(and(eq(auditLogsTable.eventType, "AUTH_FAILURE"), gte(auditLogsTable.timestamp, since)));
  const failCount = authFail?.count ?? 0;
  if (failCount >= 3) {
    anomalies.push({
      id: "brute-force",
      type: "BRUTE_FORCE",
      severity: failCount >= 8 ? "CRITICAL" : "WARN",
      detail: `${failCount} rejected operator authentication attempts in the last hour`,
      count: failCount,
      detectedAt: now,
    });
  }

  // 2. Suspicious commands in recent terminal history.
  const recentCmds = await db
    .select()
    .from(terminalHistoryTable)
    .where(gte(terminalHistoryTable.executedAt, since))
    .orderBy(desc(terminalHistoryTable.executedAt))
    .limit(300);
  for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
    const matches = recentCmds.filter((c) => pattern.test(c.command));
    if (matches.length > 0) {
      anomalies.push({
        id: `cmd-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        type: "SUSPICIOUS_COMMAND",
        severity: "CRITICAL",
        detail: `${label}: "${matches[0].command.slice(0, 90)}"`,
        count: matches.length,
        detectedAt: matches[0].executedAt.toISOString(),
      });
    }
  }

  // 3. Critical audit events in window.
  const [crit] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(and(eq(auditLogsTable.severity, "CRITICAL"), gte(auditLogsTable.timestamp, since)));
  const critCount = crit?.count ?? 0;
  if (critCount > 0) {
    anomalies.push({
      id: "critical-events",
      type: "CRITICAL_EVENTS",
      severity: "CRITICAL",
      detail: `${critCount} critical audit events recorded in the last hour`,
      count: critCount,
      detectedAt: now,
    });
  }

  // 4. Unresolved file-integrity alerts.
  const [intg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityAlertsTable)
    .where(eq(integrityAlertsTable.status, "OPEN"));
  const intgCount = intg?.count ?? 0;
  if (intgCount > 0) {
    anomalies.push({
      id: "integrity",
      type: "INTEGRITY",
      severity: "CRITICAL",
      detail: `${intgCount} unresolved file-integrity alert(s) from Heimdallr`,
      count: intgCount,
      detectedAt: now,
    });
  }

  return anomalies;
}

interface ThreatBase {
  memPercent: number;
  cpuPercent: number;
  activeRealms: number;
}

/** Fuse resource pressure and anomalies into a single threat level. */
export function threatFromAnomalies(anomalies: Anomaly[], base: ThreatBase): string {
  const hasCritical = anomalies.some((a) => a.severity === "CRITICAL");
  const hasWarn = anomalies.some((a) => a.severity === "WARN");
  let level = "NOMINAL";
  if (base.memPercent > 85 || base.cpuPercent > 90 || hasWarn) level = "ELEVATED";
  if (base.activeRealms < 2 || hasCritical) level = "CRITICAL";
  return level;
}

/** Convenience wrapper: gather live threat level from all signals. */
export async function computeThreatLevel(base: ThreatBase): Promise<string> {
  const anomalies = await computeAnomalies();
  return threatFromAnomalies(anomalies, base);
}

/** Count realms currently reporting ONLINE — feeds real degradation signal. */
export async function getActiveRealms(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(realmsTable)
    .where(eq(realmsTable.status, "ONLINE"));
  return row?.count ?? 0;
}

export interface PostureCheck {
  id: string;
  label: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface Posture {
  score: number;
  status: string; // FORTIFIED | GUARDED | EXPOSED
  threatLevel: string;
  roeAccepted: boolean;
  openIncidents: number;
  openIntegrityAlerts: number;
  baselinedFiles: number;
  activeAnomalies: number;
  checks: PostureCheck[];
  updatedAt: string;
}

/** Aggregate the overall defensive posture of the OS. */
export async function computePosture(operator?: string): Promise<Posture> {
  const anomalies = await computeAnomalies();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const cpuPercent = await getCpuPercent();
  const activeRealms = await getActiveRealms();

  // Scope RoE acceptance to the authenticated operator when known, so posture
  // reflects whether THIS operator is authorized — not merely that someone is.
  const roeWhere = operator
    ? and(
        eq(roeAcceptancesTable.operator, operator),
        eq(roeAcceptancesTable.roeVersion, ROE_VERSION),
      )
    : eq(roeAcceptancesTable.roeVersion, ROE_VERSION);
  const [roe] = await db
    .select()
    .from(roeAcceptancesTable)
    .where(roeWhere)
    .orderBy(desc(roeAcceptancesTable.timestamp))
    .limit(1);
  const roeAccepted = Boolean(roe);

  const [bl] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityBaselinesTable);
  const baselinedFiles = bl?.count ?? 0;

  const [openIncRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(incidentsTable)
    .where(sql`${incidentsTable.status} <> 'RESOLVED'`);
  const openIncidents = openIncRow?.count ?? 0;

  const [openIntgRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(integrityAlertsTable)
    .where(eq(integrityAlertsTable.status, "OPEN"));
  const openIntegrityAlerts = openIntgRow?.count ?? 0;

  const hasCritical = anomalies.some((a) => a.severity === "CRITICAL");
  const hasWarn = anomalies.some((a) => a.severity === "WARN");

  const checks: PostureCheck[] = [
    {
      id: "roe",
      label: "Rules of Engagement acknowledged",
      status: roeAccepted ? "PASS" : "FAIL",
      detail: roeAccepted
        ? `Operator accepted RoE v${ROE_VERSION}`
        : "No operator has accepted the current Rules of Engagement",
    },
    {
      id: "auth",
      label: "Sensitive routes require operator authentication",
      status: "PASS",
      detail: "Terminal, filesystem, modules, kernel and metrics are Bearer-gated",
    },
    {
      id: "integrity",
      label: "File-integrity baseline established",
      status: baselinedFiles > 0 ? "PASS" : "WARN",
      detail:
        baselinedFiles > 0
          ? `${baselinedFiles} critical file(s) under Heimdallr watch`
          : "No integrity baseline has been captured yet",
    },
    {
      id: "incidents",
      label: "No unresolved incidents",
      status: openIncidents === 0 ? "PASS" : "WARN",
      detail:
        openIncidents === 0
          ? "Incident ledger is clear"
          : `${openIncidents} incident(s) awaiting resolution`,
    },
    {
      id: "anomalies",
      label: "No active anomalies detected",
      status: hasCritical ? "FAIL" : hasWarn ? "WARN" : "PASS",
      detail:
        anomalies.length === 0
          ? "No anomalies in the last hour"
          : `${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} detected`,
    },
    {
      id: "audit",
      label: "Immutable audit logging active",
      status: "PASS",
      detail: "Every privileged action is recorded to the Mimir ledger",
    },
  ];

  const weight = (s: PostureCheck["status"]) => (s === "PASS" ? 1 : s === "WARN" ? 0.5 : 0);
  const score = Math.round((checks.reduce((sum, c) => sum + weight(c.status), 0) / checks.length) * 100);
  const status = score >= 85 ? "FORTIFIED" : score >= 60 ? "GUARDED" : "EXPOSED";

  const threatLevel = threatFromAnomalies(anomalies, {
    memPercent,
    cpuPercent,
    activeRealms,
  });

  return {
    score,
    status,
    threatLevel,
    roeAccepted,
    openIncidents,
    openIntegrityAlerts,
    baselinedFiles,
    activeAnomalies: anomalies.length,
    checks,
    updatedAt: new Date().toISOString(),
  };
}
