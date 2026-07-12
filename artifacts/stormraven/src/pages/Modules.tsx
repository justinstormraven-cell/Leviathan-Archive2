import React, { useRef } from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import { useGetModules, useUpdateModule, getGetModulesQueryKey, getGetSystemMetricsQueryKey } from "@workspace/api-client-react";
import { Cpu, Power, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Modules() {
  const queryClient = useQueryClient();
  const [authError, setAuthError] = React.useState(false);

  const { data: modules, isLoading } = useGetModules({
    query: { refetchInterval: 10000, queryKey: ["/api/modules"] }
  });

  const updateModule = useUpdateModule({
    mutation: {
      onSuccess: (updatedModule) => {
        setAuthError(false);
        // Optimistically update the modules list cache
        queryClient.setQueryData(getGetModulesQueryKey(), (old: any) => {
          if (!old) return old;
          return old.map((m: any) => m.id === updatedModule.id ? updatedModule : m);
        });
        // Invalidate metrics as active modules count might change
        queryClient.invalidateQueries({ queryKey: getGetSystemMetricsQueryKey() });
      },
      onError: (err: any) => {
        if (err?.status === 401) setAuthError(true);
      }
    }
  });

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateModule.mutate({ id, data: { status: newStatus } });
  };

  // Group modules by realm
  const modulesByRealm = React.useMemo(() => {
    if (!modules) return {};
    return modules.reduce((acc, mod) => {
      if (!acc[mod.realmName]) acc[mod.realmName] = [];
      acc[mod.realmName].push(mod);
      return acc;
    }, {} as Record<string, typeof modules>);
  }, [modules]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif" data-text="THE FORGE">
              THE FORGE
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">Subsystem Control & Allocation</p>
          </div>
          <Cpu size={32} className="text-primary opacity-50" />
        </div>

        {authError && (
          <div className="flex items-center gap-2 border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm uppercase tracking-wide" data-testid="text-auth-required">
            <Lock size={14} />
            Authentication required — unlock the live shell on the Terminal page to control modules.
          </div>
        )}

        {isLoading ? (
          <div className="text-primary animate-pulse flex items-center gap-2">
            <span className="w-2 h-4 bg-primary inline-block"></span> FETCHING MODULES...
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(modulesByRealm).map(([realmName, realmModules]) => (
              <div key={realmName} className="space-y-4">
                <h3 className="text-lg font-bold tracking-widest text-primary border-b border-border pb-1 uppercase">
                  REALM // {realmName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {realmModules.map(module => (
                    <TerminalCard 
                      key={module.id} 
                      className={`flex flex-col p-4 transition-colors ${module.status === 'ACTIVE' ? 'border-primary/50 bg-primary/5' : 'opacity-80'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-bold uppercase text-foreground">{module.name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5">
                            {module.codename}
                          </span>
                        </div>
                        <StatusBadge variant={module.status === 'ACTIVE' ? 'online' : 'offline'}>
                          {module.status}
                        </StatusBadge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground flex-1 my-3">
                        {module.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] uppercase text-warning border border-warning/30 bg-warning/10 px-1.5 py-0.5 rounded-sm">
                            <Lock size={10} /> {module.authLevel}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleToggleStatus(module.id, module.status)}
                          disabled={updateModule.isPending}
                          className={`flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 border transition-all cursor-pointer disabled:opacity-50
                            ${module.status === 'ACTIVE' 
                              ? 'border-destructive text-destructive hover:bg-destructive/10' 
                              : 'border-primary text-primary hover:bg-primary/10'}`}
                        >
                          <Power size={12} className={module.status === 'ACTIVE' ? 'text-destructive' : 'text-primary'} />
                          {module.status === 'ACTIVE' ? 'DEACTIVATE' : 'ACTIVATE'}
                        </button>
                      </div>
                      
                      {module.lastActivated && (
                        <div className="text-[10px] text-muted-foreground mt-2 text-right">
                          LAST ACTIVATED: {new Date(module.lastActivated).toLocaleString()}
                        </div>
                      )}
                    </TerminalCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
