import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { useGetAnomalies } from "@workspace/api-client-react";
import { Radar, Eye, AlertTriangle } from "lucide-react";
import { useAuth } from "@/desktop/auth";
import LoginGate from "@/desktop/apps/LoginGate";

function sevVariant(s: string) {
  const v = s.toUpperCase();
  if (v === "CRITICAL") return "critical" as const;
  if (v === "WARN" || v === "WARNING") return "warn" as const;
  return "info" as const;
}

export default function Huginn() {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Huginn" subtitle="Authenticate to view the intrusion feed" />;

  return <HuginnInner />;
}

function HuginnInner() {
  const { data, isLoading } = useGetAnomalies({
    query: { refetchInterval: 8000, queryKey: ["/api/defense/anomalies"] },
  });

  const critical = data?.threatLevel === "CRITICAL";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="HUGINN &amp; MUNINN"
            >
              HUGINN &amp; MUNINN
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Intrusion Detection · Anomaly Surveillance
            </p>
          </div>
          <Radar size={32} className={`opacity-60 ${critical ? "text-destructive animate-pulse" : "text-primary"}`} />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
          <TerminalCard variant={critical ? "destructive" : "primary"} className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">THREAT LEVEL</span>
            <span className={`text-2xl sm:text-3xl font-bold tracking-wider uppercase ${critical ? "text-destructive" : "text-primary"}`}>
              {data?.threatLevel || "SCANNING"}
            </span>
          </TerminalCard>
          <TerminalCard className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">ACTIVE SIGNALS</span>
            <span className="text-2xl sm:text-3xl font-bold tracking-wider text-foreground">{data?.total ?? 0}</span>
          </TerminalCard>
          <TerminalCard variant={data && data.critical > 0 ? "destructive" : "default"} className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">CRITICAL</span>
            <span className={`text-2xl sm:text-3xl font-bold tracking-wider ${data && data.critical > 0 ? "text-destructive" : "text-foreground"}`}>
              {data?.critical ?? 0}
            </span>
          </TerminalCard>
        </div>

        <TerminalCard className="flex-1 overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-4 bg-primary inline-block" /> SCANNING RAVEN FEED…
            </div>
          ) : data && data.anomalies.length > 0 ? (
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full min-w-[680px] text-sm text-left">
                <thead className="text-xs uppercase bg-secondary/80 text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 border-b border-border">DETECTED</th>
                    <th className="px-4 py-3 border-b border-border">TYPE</th>
                    <th className="px-4 py-3 border-b border-border">SEVERITY</th>
                    <th className="px-4 py-3 border-b border-border">COUNT</th>
                    <th className="px-4 py-3 border-b border-border w-1/2">DETAIL</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border/50">
                  {data.anomalies.map((a) => (
                    <tr key={a.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(a.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap uppercase">{a.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge variant={sevVariant(a.severity)}>{a.severity}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{a.count}</td>
                      <td className="px-4 py-3 text-foreground text-sm">{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-16">
              <Eye size={40} className="text-primary/40" />
              <p className="uppercase tracking-wider text-sm">The ravens report calm skies</p>
              <p className="text-xs">No anomalies detected in the last hour</p>
            </div>
          )}
        </TerminalCard>
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
