import React, { useState } from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { useGetAuditLogs } from "@workspace/api-client-react";
import { ShieldAlert, Filter, Search } from "lucide-react";

export default function AuditLog() {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  
  const { data: logs, isLoading } = useGetAuditLogs(
    severityFilter ? { severity: severityFilter } : {},
    { query: { refetchInterval: 10000, queryKey: ["/api/audit-logs", severityFilter ? { severity: severityFilter } : {}] } }
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif" data-text="MIMIR'S LEDGER">
              MIMIR'S LEDGER
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">System Event Chronicle & Forensic Trail</p>
          </div>
          <ShieldAlert size={32} className="text-primary opacity-50" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 bg-secondary p-3 border border-border shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase font-bold tracking-wider">
            <Filter size={16} /> Filters:
          </div>
          <div className="flex items-center gap-2">
            {['', 'INFO', 'WARN', 'CRITICAL', 'SUCCESS'].map((sev) => (
              <button
                key={sev || 'ALL'}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 text-xs uppercase font-bold border transition-colors cursor-pointer
                  ${severityFilter === sev 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`}
              >
                {sev || 'ALL EVENTS'}
              </button>
            ))}
          </div>
        </div>

        {/* Log Table Container */}
        <TerminalCard className="flex-1 overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-4 bg-primary inline-block"></span> READING LOGS...
            </div>
          ) : (
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-secondary/80 text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 border-b border-border">TIMESTAMP</th>
                    <th className="px-4 py-3 border-b border-border">SEVERITY</th>
                    <th className="px-4 py-3 border-b border-border">EVENT TYPE</th>
                    <th className="px-4 py-3 border-b border-border">REALM / MODULE</th>
                    <th className="px-4 py-3 border-b border-border w-1/2">MESSAGE</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-border/50">
                  {logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge variant={
                          log.severity === 'INFO' ? 'info' :
                          log.severity === 'WARN' ? 'warn' :
                          log.severity === 'SUCCESS' ? 'success' : 'critical'
                        }>
                          {log.severity}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap uppercase">
                        {log.eventType}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {log.realmName ? <span className="text-primary/80">{log.realmName}</span> : <span className="opacity-30">-</span>}
                        {log.realmName && log.moduleName && <span className="mx-1">/</span>}
                        {log.moduleName ? <span className="text-foreground">{log.moduleName}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-foreground text-sm">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                  {logs?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground uppercase">
                        NO AUDIT LOGS FOUND MATCHING CURRENT FILTERS
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TerminalCard>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--secondary));
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </Layout>
  );
}
