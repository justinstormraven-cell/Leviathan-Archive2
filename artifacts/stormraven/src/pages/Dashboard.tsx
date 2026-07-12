import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { 
  useGetSystemMetrics, 
  useGetRealms, 
  useGetModules, 
  useGetAuditLogs 
} from "@workspace/api-client-react";
import { Activity, Cpu, Server, ShieldAlert, Zap } from "lucide-react";
import { Link } from "wouter";

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Realms Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-bold tracking-widest text-primary flex items-center gap-2">
                <Zap size={14} /> YGGDRASIL TOPOLOGY
              </h2>
              <Link href="/realms" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">View All</Link>
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
                <Link href="/modules" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">Manage</Link>
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
                <Link href="/audit" className="text-xs text-muted-foreground hover:text-primary uppercase tracking-wider">Logs</Link>
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
