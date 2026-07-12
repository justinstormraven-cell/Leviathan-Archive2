import React from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { useGetRealms } from "@workspace/api-client-react";
import { Server, HardDrive, Activity, FolderGit2 } from "lucide-react";

export default function Realms() {
  const { data: realms, isLoading } = useGetRealms({
    query: { refetchInterval: 10000, queryKey: ["/api/realms"] }
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text" data-text="YGGDRASIL TOPOLOGY">
              YGGDRASIL TOPOLOGY
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">System Realms Overview & Monitoring</p>
          </div>
          <Server size={32} className="text-primary opacity-50" />
        </div>

        {isLoading ? (
          <div className="text-primary animate-pulse flex items-center gap-2">
            <span className="w-2 h-4 bg-primary inline-block"></span> SCANNING REALMS...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realms?.map((realm) => (
              <TerminalCard 
                key={realm.id} 
                variant={realm.status === 'CRITICAL' ? 'destructive' : realm.status === 'DEGRADED' ? 'warning' : 'primary'}
                className="flex flex-col group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-widest text-foreground uppercase group-hover:text-primary transition-colors">
                      {realm.name}
                    </h2>
                    <span className="text-xs text-muted-foreground font-mono uppercase bg-secondary px-2 py-0.5 mt-1 inline-block">
                      {realm.codename}
                    </span>
                  </div>
                  <StatusBadge variant={
                    realm.status === 'ONLINE' ? 'online' : 
                    realm.status === 'OFFLINE' ? 'offline' : 
                    realm.status === 'DEGRADED' ? 'degraded' : 'critical'
                  } className="text-sm px-3 py-1">
                    {realm.status}
                  </StatusBadge>
                </div>

                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  {realm.description}
                </p>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <FolderGit2 size={12} /> MOUNT PATH
                    </span>
                    <div className="text-sm font-mono text-primary truncate" title={realm.mountPath}>
                      {realm.mountPath}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <HardDrive size={12} /> DISK USAGE
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            (realm.diskUsagePercent || 0) > 90 ? 'bg-destructive' : 
                            (realm.diskUsagePercent || 0) > 75 ? 'bg-warning' : 'bg-primary'
                          }`} 
                          style={{ width: `${realm.diskUsagePercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">{realm.diskUsagePercent}%</span>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <Activity size={12} /> ACTIVE PROCESSES
                    </span>
                    <div className="text-sm font-mono text-foreground">
                      {realm.activeProcesses} <span className="text-muted-foreground">procs</span>
                    </div>
                  </div>
                </div>
              </TerminalCard>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
