import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { 
  useGetSystemMetrics, 
  useGetRealms, 
  useGetModules, 
  useGetAuditLogs,
  useGetPosture
} from "@workspace/api-client-react";
import { Activity, Cpu, Server, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { PageLink } from "@/desktop/PageLink";

export default function Dashboard() {
  const { data: metrics } = useGetSystemMetrics({
    query: { refetchInterval: 5000, queryKey: ["/api/system/metrics"] }
  });

  const { data: realms } = useGetRealms({
    query: { refetchInterval: 10000, queryKey: ["/api/realms"] }
  });

  const { data: modules } = useGetModules({
    query: { refetchInterval: 10000, queryKey: ["/api/modules"] }
  });

  const { data: audits } = useGetAuditLogs(
    { limit: 5 },
    { query: { refetchInterval: 5000, queryKey: ["/api/audit-logs", { limit: 5 }] } }
  );

  const { data: posture } = useGetPosture({
    query: { refetchInterval: 15000, queryKey: ["/api/defense/posture"] }
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif" data-text="BIFROST">
            BIFROST
          </h1>
          <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            LIVE MONITORING
          </span>
        </div>

        {/* Top metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <TerminalCard variant={metrics?.threatLevel === 'CRITICAL' ? 'destructive' : 'default'} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold tracking-widest">THREAT LEVEL</span>
              <ShieldAlert size={16} className={metrics?.threatLevel === 'CRITICAL' ? 'text-destructive' : 'text-primary'} />
            </div>
            <div className={`text-3xl font-bold tracking-wider uppercase ${metrics?.threatLevel === 'CRITICAL' ? 'text-destructive' : 'text-primary'}`}>
              {metrics?.threatLevel || "SCANNING"}
            </div>
          </TerminalCard>

          <TerminalCard className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold tracking-widest">ACTIVE REALMS</span>
              <Server size={16} className="text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-wider text-foreground">
              {metrics?.activeRealms || 0}
            </div>
          </TerminalCard>

          <TerminalCard className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold tracking-widest">MODULES (ON/TOT)</span>
              <Cpu size={16} className="text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-wider text-foreground">
              {metrics?.activeModules || 0} <span className="text-muted-foreground text-xl">/ {metrics?.totalModules || 0}</span>
            </div>
          </TerminalCard>

          <TerminalCard className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold tracking-widest">SYS LOAD</span>
              <Activity size={16} className="text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-wider text-foreground">
              {metrics?.cpuPercent?.toFixed(1) || "0.0"}%
            </div>
          </TerminalCard>
        </div>

        {/* Defensive posture */}
        {posture && (
          <TerminalCard
            variant={posture.score >= 85 ? "primary" : posture.score >= 60 ? "warning" : "destructive"}
            className="space-y-3"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-bold tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck size={14} /> DEFENSIVE POSTURE
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{posture.status}</span>
                <span className="text-2xl font-bold text-primary">
                  {posture.score}
                  <span className="text-sm text-muted-foreground">/100</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {posture.checks.map((c) => (
                <div
                  key={c.id}
                  title={c.detail}
                  className="p-2 border border-border bg-secondary/30 rounded-sm flex flex-col gap-1"
                >
                  <StatusBadge
                    variant={c.status === "PASS" ? "success" : c.status === "WARN" ? "warn" : "critical"}
                    className="text-[9px] self-start"
                  >
                    {c.status}
                  </StatusBadge>
                  <span className="text-[10px] text-foreground leading-tight">{c.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs uppercase tracking-wider">
              <PageLink href="/huginn" className="text-muted-foreground hover:text-primary">Huginn Watch</PageLink>
              <PageLink href="/heimdallr" className="text-muted-foreground hover:text-primary">Heimdallr</PageLink>
              <PageLink href="/valkyrie" className="text-muted-foreground hover:text-primary">Valkyrie</PageLink>
              <PageLink href="/logberg" className="text-muted-foreground hover:text-primary">Lögberg</PageLink>
            </div>
          </TerminalCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Realms Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-bold tracking-widest text-primary flex items-center gap-2">
                <Zap size={14} /> YGGDRASIL TOPOLOGY
              </h2>
              <PageLink href="/realms" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">View All</PageLink>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {realms?.map((realm) => (
                <TerminalCard key={realm.id} variant={realm.status === 'CRITICAL' ? 'destructive' : realm.status === 'DEGRADED' ? 'warning' : 'default'} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-lg tracking-wider text-foreground uppercase">{realm.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{realm.codename}</div>
                    </div>
                    <StatusBadge variant={
                      realm.status === 'ONLINE' ? 'online' : 
                      realm.status === 'OFFLINE' ? 'offline' : 
                      realm.status === 'DEGRADED' ? 'degraded' : 'critical'
                    }>
                      {realm.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground uppercase">
                    <span>DSK: {realm.diskUsagePercent}%</span>
                    <span>PROC: {realm.activeProcesses}</span>
                  </div>
                </TerminalCard>
              ))}
            </div>
          </div>

          {/* Quick modules and Audit */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-sm font-bold tracking-widest text-primary">THE FORGE</h2>
                <PageLink href="/modules" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">Manage</PageLink>
              </div>
              <div className="flex flex-col gap-2">
                {modules?.slice(0, 4).map(module => (
                  <div key={module.id} className="flex items-center justify-between p-2 border border-border bg-secondary/30 rounded-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold uppercase">{module.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{module.realmName}</span>
                    </div>
                    <StatusBadge variant={module.status === 'ACTIVE' ? 'online' : 'offline'}>
                      {module.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-sm font-bold tracking-widest text-primary">MIMIR // LEDGER</h2>
                <PageLink href="/audit" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">Logs</PageLink>
              </div>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {audits?.map(log => (
                  <div key={log.id} className="border-l-2 pl-2 py-1 border-border flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <StatusBadge variant={
                        log.severity === 'INFO' ? 'info' :
                        log.severity === 'WARN' ? 'warn' :
                        log.severity === 'SUCCESS' ? 'success' : 'critical'
                      } className="text-[9px] px-1 py-0">
                        {log.severity}
                      </StatusBadge>
                    </div>
                    <span className="text-foreground truncate" title={log.message}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
