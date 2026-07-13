import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import {
  useGetIntegrityStatus,
  useGetIntegrityBaselines,
  useGetIntegrityAlerts,
  useCaptureIntegrityBaseline,
  useRunIntegrityScan,
  useUpdateIntegrityAlert,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Fingerprint, ScanLine, Camera, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/desktop/auth";
import LoginGate from "@/desktop/apps/LoginGate";

function shortHash(h?: string | null) {
  if (!h) return "—";
  return h.slice(0, 12);
}

export default function Heimdallr() {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Heimdallr" subtitle="Authenticate to guard file integrity" />;
  return <HeimdallrInner />;
}

function HeimdallrInner() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries();

  const { data: status } = useGetIntegrityStatus({
    query: { refetchInterval: 15000, queryKey: ["/api/integrity/status"] },
  });
  const { data: baselines } = useGetIntegrityBaselines({
    query: { refetchInterval: 30000, queryKey: ["/api/integrity/baselines"] },
  });
  const { data: alerts } = useGetIntegrityAlerts({
    query: { refetchInterval: 15000, queryKey: ["/api/integrity/alerts"] },
  });

  const capture = useCaptureIntegrityBaseline({ mutation: { onSuccess: invalidate } });
  const scan = useRunIntegrityScan({ mutation: { onSuccess: invalidate } });
  const resolveAlert = useUpdateIntegrityAlert({ mutation: { onSuccess: invalidate } });

  const openAlerts = (alerts || []).filter((a) => a.status === "OPEN");

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="HEIMDALLR"
            >
              HEIMDALLR
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              File Integrity Monitoring · The Watchman of the Bifrost
            </p>
          </div>
          <Fingerprint size={32} className="text-primary opacity-60" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 shrink-0">
          <TerminalCard className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">WATCHED</span>
            <span className="text-3xl font-bold text-foreground">{status?.watched ?? 0}</span>
          </TerminalCard>
          <TerminalCard className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">BASELINED</span>
            <span className="text-3xl font-bold text-foreground">{status?.baselined ?? 0}</span>
          </TerminalCard>
          <TerminalCard variant={status && status.openAlerts > 0 ? "destructive" : "default"} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">OPEN ALERTS</span>
            <span className={`text-3xl font-bold ${status && status.openAlerts > 0 ? "text-destructive" : "text-foreground"}`}>
              {status?.openAlerts ?? 0}
            </span>
          </TerminalCard>
          <TerminalCard variant={status?.monitoring ? "primary" : "warning"} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">STATUS</span>
            <span className={`text-xl font-bold uppercase ${status?.monitoring ? "text-primary" : "text-warning"}`}>
              {status?.monitoring ? "GUARDING" : "UNSEALED"}
            </span>
          </TerminalCard>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => capture.mutate()}
            disabled={capture.isPending}
            className="flex items-center gap-2 rounded-md bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-40"
            data-testid="button-capture-baseline"
          >
            {capture.isPending ? <Loader2 className="animate-spin" size={15} /> : <Camera size={15} />}
            Capture Baseline
          </button>
          <button
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="flex items-center gap-2 rounded-md border border-primary/40 bg-transparent hover:bg-primary/10 text-primary text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-40"
            data-testid="button-run-scan"
          >
            {scan.isPending ? <Loader2 className="animate-spin" size={15} /> : <ScanLine size={15} />}
            Run Integrity Scan
          </button>
          {scan.data && (
            <span className="flex items-center text-xs text-muted-foreground uppercase tracking-wider">
              Last scan: {scan.data.checked} files · {scan.data.alerts.length} new alert(s)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Alerts */}
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold tracking-widest text-primary border-b border-border pb-2 mb-3 shrink-0">
              TAMPER ALERTS
            </h2>
            <div className="overflow-auto flex-1 custom-scrollbar space-y-2 pr-1">
              {(alerts || []).length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-12">
                  <ShieldCheck size={34} className="text-primary/40" />
                  <p className="text-xs uppercase tracking-wider">No integrity violations</p>
                </div>
              )}
              {(alerts || []).map((a) => (
                <TerminalCard
                  key={a.id}
                  variant={a.status !== "OPEN" ? "default" : a.severity === "CRITICAL" ? "destructive" : "warning"}
                  className="p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge variant={a.severity === "CRITICAL" ? "critical" : "warn"}>
                      {a.changeType}
                    </StatusBadge>
                    <StatusBadge variant={a.status === "OPEN" ? "warn" : "success"}>{a.status}</StatusBadge>
                  </div>
                  <p className="font-mono text-xs text-foreground break-all">{a.path}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>exp {shortHash(a.expectedHash)}</span>
                    <span>got {shortHash(a.actualHash)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                    {a.status === "OPEN" && (
                      <button
                        onClick={() => resolveAlert.mutate({ id: a.id, data: { status: "RESOLVED" } })}
                        disabled={resolveAlert.isPending}
                        className="text-[11px] uppercase tracking-wider text-primary hover:underline disabled:opacity-40"
                        data-testid={`button-resolve-alert-${a.id}`}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </TerminalCard>
              ))}
            </div>
          </div>

          {/* Baselines */}
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold tracking-widest text-primary border-b border-border pb-2 mb-3 shrink-0">
              SEALED BASELINES
              {baselines && baselines.pending.length > 0 && (
                <span className="ml-2 text-warning">· {baselines.pending.length} unsealed</span>
              )}
            </h2>
            <div className="overflow-auto flex-1 custom-scrollbar space-y-1.5 pr-1">
              {baselines?.pending.map((b) => (
                <div key={`p-${b.path}`} className="flex items-center justify-between gap-2 p-2 border border-warning/30 bg-warning/5 rounded-sm">
                  <span className="font-mono text-xs text-foreground break-all">{b.path}</span>
                  <StatusBadge variant="warn" className="shrink-0">UNSEALED</StatusBadge>
                </div>
              ))}
              {baselines?.baselines.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 p-2 border border-border bg-secondary/30 rounded-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-foreground break-all">{b.path}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{shortHash(b.hash)} · {b.sizeBytes} B</p>
                  </div>
                  <StatusBadge variant="online" className="shrink-0">SEALED</StatusBadge>
                </div>
              ))}
              {!baselines?.baselines.length && !baselines?.pending.length && (
                <p className="text-xs text-muted-foreground uppercase py-8 text-center">No watched paths</p>
              )}
            </div>
          </div>
        </div>
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
