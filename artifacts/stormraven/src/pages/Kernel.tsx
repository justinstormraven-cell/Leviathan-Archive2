import React, { useEffect, useRef, useState } from "react";
import Layout from "@/components/layout";
import { TerminalCard } from "@/components/ui/terminal-components";
import { useGetKernelLog, getGetKernelLogQueryKey } from "@workspace/api-client-react";
import { Binary, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const LEVEL_COLOR: Record<string, string> = {
  INFO: "text-primary",
  WARN: "text-warning",
  CRIT: "text-destructive",
};

function fmtTs(t: number): string {
  return t.toFixed(6).padStart(12, " ");
}

export default function Kernel() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);

  const { data, isLoading, isFetching } = useGetKernelLog({
    query: { queryKey: getGetKernelLogQueryKey() },
  });

  const lines = data?.lines ?? [];

  // Staggered "boot" reveal each time a fresh log arrives.
  useEffect(() => {
    if (!lines.length) return;
    setRevealed(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= lines.length) clearInterval(id);
    }, 90);
    return () => clearInterval(id);
  }, [data?.capturedAt, lines.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [revealed]);

  const reprobe = () => {
    queryClient.invalidateQueries({ queryKey: getGetKernelLogQueryKey() });
  };

  const visible = lines.slice(0, revealed);
  const booting = revealed < lines.length;

  return (
    <Layout>
      <div className="h-full flex flex-col max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="YMIR CORE"
            >
              YMIR CORE
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Live Hardened Kernel Telemetry
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={reprobe}
              disabled={isFetching}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary border border-primary/40 hover:bg-primary/10 disabled:opacity-40 px-3 py-1.5 transition-colors"
              data-testid="button-reprobe"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              Re-probe core
            </button>
            <Binary size={32} className="text-primary opacity-50" />
          </div>
        </div>

        <TerminalCard className="flex-1 flex flex-col font-mono text-sm bg-black/90 p-0 border-primary/30">
          <div className="bg-secondary/50 border-b border-border p-2 flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest shrink-0">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="ml-2">
              {data
                ? `ymir@${data.hostname} — kernel ${data.kernelVersion}`
                : "ymir core — connecting"}
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-0.5 custom-scrollbar text-foreground"
          >
            {isLoading && (
              <div className="animate-pulse text-primary">
                {"> reading kernel ring buffer…"}
              </div>
            )}

            {visible.map((line) => (
              <div key={line.seq} className="flex gap-2 leading-relaxed">
                <span className="text-muted-foreground/60 shrink-0 whitespace-pre">
                  [{fmtTs(line.timestamp)}]
                </span>
                <span className="text-foreground break-all">
                  <span
                    className={`${LEVEL_COLOR[line.level] ?? "text-muted-foreground"} font-bold`}
                  >
                    {line.subsystem}:
                  </span>{" "}
                  <span
                    className={
                      line.level === "WARN"
                        ? "text-warning"
                        : line.level === "CRIT"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {line.message}
                  </span>
                </span>
              </div>
            ))}

            {booting && lines.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="animate-pulse block w-2 h-4 bg-primary"></span>
              </div>
            )}

            {!booting && lines.length > 0 && (
              <div className="text-success pt-3">
                {"> "}
                {lines.length} subsystems reported. Core telemetry captured{" "}
                {data ? new Date(data.capturedAt).toLocaleTimeString() : ""}. All
                readings are live from the host.
              </div>
            )}
          </div>
        </TerminalCard>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.5); }
      `}</style>
    </Layout>
  );
}
