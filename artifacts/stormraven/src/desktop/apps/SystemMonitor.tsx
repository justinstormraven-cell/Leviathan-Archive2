import React from "react";
import {
  useGetProcesses,
  getGetProcessesQueryKey,
  useGetSystemMetrics,
  getGetSystemMetricsQueryKey,
} from "@workspace/api-client-react";
import { Cpu, MemoryStick, Gauge, Boxes } from "lucide-react";

function Ring({
  label,
  value,
  suffix = "%",
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const hue = pct > 85 ? 353 : pct > 60 ? 42 : 196;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
      <div
        className="relative w-14 h-14 rounded-full grid place-items-center shrink-0"
        style={{
          background: `conic-gradient(hsl(${hue} 90% 55%) ${pct * 3.6}deg, hsl(208 30% 16%) 0deg)`,
        }}
      >
        <div className="w-10 h-10 rounded-full bg-card grid place-items-center">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl font-medium text-foreground tabular-nums">
          {value.toFixed(suffix === "%" ? 1 : 2)}
          <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

export default function SystemMonitor() {
  const { data: procs } = useGetProcesses({
    query: { queryKey: getGetProcessesQueryKey(), refetchInterval: 2000 },
  });
  const { data: metrics } = useGetSystemMetrics({
    query: { queryKey: getGetSystemMetricsQueryKey(), refetchInterval: 3000 },
  });

  return (
    <div className="h-full flex flex-col font-sans text-sm">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 shrink-0">
        <Ring label="CPU" value={metrics?.cpuPercent ?? 0} icon={Cpu} />
        <Ring label="Memory" value={metrics?.memoryPercent ?? 0} icon={MemoryStick} />
        <Ring
          label="Load (1m)"
          value={procs?.loadAvg1 ?? 0}
          suffix=""
          icon={Gauge}
        />
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center shrink-0">
            <Boxes size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Processes
            </p>
            <p className="text-xl font-medium text-foreground tabular-nums">
              {procs?.count ?? 0}
            </p>
          </div>
        </div>
      </div>

      <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
        Active processes · load {procs?.loadAvg1 ?? 0} / {procs?.loadAvg5 ?? 0} /{" "}
        {procs?.loadAvg15 ?? 0}
      </p>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0 glass-strong">
            <tr>
              <th className="text-left font-medium px-3 py-1.5 w-16">PID</th>
              <th className="text-left font-medium px-3 py-1.5 w-24 hidden sm:table-cell">
                User
              </th>
              <th className="text-left font-medium px-3 py-1.5">Command</th>
              <th className="text-right font-medium px-3 py-1.5 w-20">CPU%</th>
              <th className="text-right font-medium px-3 py-1.5 w-20">MEM%</th>
            </tr>
          </thead>
          <tbody>
            {(procs?.processes ?? []).map((p) => (
              <tr
                key={p.pid}
                className="border-b border-border/40 hover:bg-primary/5"
                data-testid={`row-proc-${p.pid}`}
              >
                <td className="px-3 py-1 font-mono text-xs text-muted-foreground">{p.pid}</td>
                <td className="px-3 py-1 text-xs hidden sm:table-cell">{p.user}</td>
                <td className="px-3 py-1 font-mono text-xs truncate max-w-0">{p.command}</td>
                <td className="px-3 py-1 text-right font-mono text-xs tabular-nums">
                  <span className={p.cpu > 50 ? "text-warning" : "text-foreground"}>
                    {p.cpu.toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-1 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {p.mem.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
