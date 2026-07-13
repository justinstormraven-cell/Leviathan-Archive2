import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { useGetComplianceReport, type ComplianceReport } from "@workspace/api-client-react";
import { Scale, Download, FileJson } from "lucide-react";
import { useAuth } from "@/desktop/auth";
import LoginGate from "@/desktop/apps/LoginGate";

export default function Logberg() {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Lögberg" subtitle="Authenticate to review the compliance codex" />;
  return <LogbergInner />;
}

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type Report = ComplianceReport;

function toMarkdown(r: Report): string {
  const lines: string[] = [];
  lines.push(`# StormRaven OS — Ethics & Compliance Report`);
  lines.push(`Generated: ${new Date(r.generatedAt).toLocaleString()}`);
  lines.push(`Rules of Engagement version: ${r.roeVersion}`);
  lines.push(``, `## Ethical Hacking Laws`);
  r.laws.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
  lines.push(``, `## Posture`);
  lines.push(`- Score: ${r.posture.score}/100 (${r.posture.status})`);
  lines.push(`- Threat level: ${r.posture.threatLevel}`);
  lines.push(``, `## Audit Ledger`);
  lines.push(`- Total: ${r.audit.total} · Info: ${r.audit.info} · Success: ${r.audit.success} · Warn: ${r.audit.warn} · Critical: ${r.audit.critical}`);
  lines.push(``, `## Incidents`);
  lines.push(`- Total: ${r.incidents.total} · Open: ${r.incidents.open} · Acknowledged: ${r.incidents.acknowledged} · Resolved: ${r.incidents.resolved}`);
  lines.push(``, `## Integrity`);
  lines.push(`- Baselined files: ${r.integrity.baselined} · Open alerts: ${r.integrity.openAlerts}`);
  lines.push(``, `## RoE Acceptances`);
  if (r.acceptances.length === 0) lines.push(`_None recorded._`);
  r.acceptances.forEach((a) =>
    lines.push(`- ${new Date(a.timestamp).toLocaleString()} — ${a.operator} (v${a.roeVersion}) — scope: ${a.authorizedScope}${a.ipAddress ? ` — ${a.ipAddress}` : ""}`),
  );
  return lines.join("\n");
}

function LogbergInner() {
  const { data: r } = useGetComplianceReport({
    query: { refetchInterval: 20000, queryKey: ["/api/compliance/report"] },
  });

  const stamp = () => new Date().toISOString().slice(0, 10);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="LÖGBERG"
            >
              LÖGBERG
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Ethics &amp; Compliance Codex · The Law Rock
            </p>
          </div>
          <Scale size={32} className="text-primary opacity-60" />
        </div>

        {!r ? (
          <div className="p-6 text-primary animate-pulse flex items-center gap-2">
            <span className="w-2 h-4 bg-primary inline-block" /> RECITING THE LAW…
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pr-1">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => download(`stormraven-compliance-${stamp()}.json`, "application/json", JSON.stringify(r, null, 2))}
                className="flex items-center gap-2 rounded-md bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 transition-colors"
                data-testid="button-export-json"
              >
                <FileJson size={15} /> Export JSON
              </button>
              <button
                onClick={() => download(`stormraven-compliance-${stamp()}.md`, "text/markdown", toMarkdown(r))}
                className="flex items-center gap-2 rounded-md border border-primary/40 bg-transparent hover:bg-primary/10 text-primary text-sm font-semibold px-4 py-2 transition-colors"
                data-testid="button-export-md"
              >
                <Download size={15} /> Export Report
              </button>
              <span className="flex items-center text-xs text-muted-foreground uppercase tracking-wider">
                Generated {new Date(r.generatedAt).toLocaleString()} · RoE v{r.roeVersion}
              </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <TerminalCard variant={r.posture.score >= 85 ? "primary" : r.posture.score >= 60 ? "warning" : "destructive"} className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-widest text-muted-foreground">POSTURE</span>
                <span className="text-3xl font-bold text-foreground">{r.posture.score}<span className="text-base text-muted-foreground">/100</span></span>
                <span className="text-[10px] uppercase text-muted-foreground">{r.posture.status}</span>
              </TerminalCard>
              <TerminalCard className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-widest text-muted-foreground">AUDIT EVENTS</span>
                <span className="text-3xl font-bold text-foreground">{r.audit.total}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{r.audit.critical} critical</span>
              </TerminalCard>
              <TerminalCard variant={r.incidents.open > 0 ? "warning" : "default"} className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-widest text-muted-foreground">INCIDENTS</span>
                <span className="text-3xl font-bold text-foreground">{r.incidents.total}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{r.incidents.open} open</span>
              </TerminalCard>
              <TerminalCard variant={r.integrity.openAlerts > 0 ? "destructive" : "default"} className="flex flex-col gap-1">
                <span className="text-xs font-bold tracking-widest text-muted-foreground">INTEGRITY</span>
                <span className="text-3xl font-bold text-foreground">{r.integrity.baselined}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{r.integrity.openAlerts} alerts</span>
              </TerminalCard>
            </div>

            {/* Laws */}
            <div>
              <h2 className="text-sm font-bold tracking-widest text-primary border-b border-border pb-2 mb-3">
                THE EIGHT LAWS
              </h2>
              <ol className="space-y-2">
                {r.laws.map((law, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/90 border-l-2 border-primary/40 pl-3 py-1">
                    <span className="text-primary font-mono text-xs shrink-0 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <span>{law}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Acceptances */}
            <div>
              <h2 className="text-sm font-bold tracking-widest text-primary border-b border-border pb-2 mb-3">
                CONSENT RECORDS
              </h2>
              {r.acceptances.length === 0 ? (
                <p className="text-xs text-muted-foreground uppercase">No RoE acceptances recorded</p>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {r.acceptances.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-2 border border-border bg-secondary/30 rounded-sm">
                      <span className="text-foreground">{a.operator}</span>
                      <StatusBadge variant="online" className="text-[9px]">v{a.roeVersion}</StatusBadge>
                      <span className="text-muted-foreground truncate max-w-[50%]" title={a.authorizedScope}>{a.authorizedScope}</span>
                      <span className="text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--secondary)); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.5); }
      `}</style>
    </Layout>
  );
}
