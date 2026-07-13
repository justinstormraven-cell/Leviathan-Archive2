import React, { useState } from "react";
import Layout from "@/components/layout";
import { TerminalCard, StatusBadge } from "@/components/ui/terminal-components";
import {
  useGetIncidents,
  useCreateIncident,
  useUpdateIncident,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Swords, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/desktop/auth";
import LoginGate from "@/desktop/apps/LoginGate";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const CATEGORIES = ["INTRUSION", "MALWARE", "INTEGRITY", "NETWORK", "POLICY", "OTHER"];

function sevVariant(s: string) {
  const v = s.toUpperCase();
  if (v === "CRITICAL" || v === "HIGH") return "critical" as const;
  if (v === "MEDIUM") return "warn" as const;
  return "info" as const;
}
function statusVariant(s: string) {
  const v = s.toUpperCase();
  if (v === "RESOLVED") return "success" as const;
  if (v === "ACKNOWLEDGED") return "warn" as const;
  return "critical" as const;
}

export default function Valkyrie() {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Valkyrie" subtitle="Authenticate to command the incident ledger" />;
  return <ValkyrieInner />;
}

function ValkyrieInner() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries();

  const { data: incidents, isLoading } = useGetIncidents({
    query: { refetchInterval: 12000, queryKey: ["/api/incidents"] },
  });

  const create = useCreateIncident({ mutation: { onSuccess: invalidate } });
  const update = useUpdateIncident({ mutation: { onSuccess: invalidate } });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("INTRUSION");
  const [severity, setSeverity] = useState("MEDIUM");

  const submit = () => {
    if (!title.trim() || create.isPending) return;
    create.mutate(
      { data: { title: title.trim(), description: description.trim(), category, severity } },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setCategory("INTRUSION");
          setSeverity("MEDIUM");
        },
      },
    );
  };

  const resolve = (id: number) => {
    const resolution = window.prompt("Resolution notes:") ?? "";
    update.mutate({ id, data: { status: "RESOLVED", resolution } });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="VALKYRIE"
            >
              VALKYRIE
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Incident Response Ledger · Choosers of the Slain
            </p>
          </div>
          <Swords size={32} className="text-primary opacity-60" />
        </div>

        {/* New incident */}
        <TerminalCard className="shrink-0 space-y-3">
          <h2 className="text-sm font-bold tracking-widest text-primary">DECLARE INCIDENT</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Incident title"
              className="rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              data-testid="input-incident-title"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                data-testid="select-incident-category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                data-testid="select-incident-severity"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What happened?"
            className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 resize-none"
            data-testid="input-incident-description"
          />
          <button
            onClick={submit}
            disabled={create.isPending || !title.trim()}
            className="flex items-center gap-2 rounded-md bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-40"
            data-testid="button-create-incident"
          >
            {create.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            Open Incident
          </button>
        </TerminalCard>

        {/* Ledger */}
        <TerminalCard className="flex-1 overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-4 bg-primary inline-block" /> SUMMONING LEDGER…
            </div>
          ) : incidents && incidents.length > 0 ? (
            <div className="overflow-auto flex-1 custom-scrollbar divide-y divide-border/50">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 hover:bg-primary/5 transition-colors flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge variant={sevVariant(inc.severity)}>{inc.severity}</StatusBadge>
                        <StatusBadge variant={statusVariant(inc.status)}>{inc.status}</StatusBadge>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{inc.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mt-1.5">{inc.title}</h3>
                      {inc.description && <p className="text-xs text-muted-foreground mt-1">{inc.description}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
                      {new Date(inc.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {inc.resolution && (
                    <p className="text-xs text-success/90 border-l-2 border-success/40 pl-2">
                      Resolution: {inc.resolution}
                    </p>
                  )}
                  {inc.status !== "RESOLVED" && (
                    <div className="flex items-center gap-3">
                      {inc.status === "OPEN" && (
                        <button
                          onClick={() => update.mutate({ id: inc.id, data: { status: "ACKNOWLEDGED" } })}
                          disabled={update.isPending}
                          className="text-[11px] uppercase tracking-wider text-warning hover:underline disabled:opacity-40"
                          data-testid={`button-ack-incident-${inc.id}`}
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => resolve(inc.id)}
                        disabled={update.isPending}
                        className="text-[11px] uppercase tracking-wider text-primary hover:underline disabled:opacity-40"
                        data-testid={`button-resolve-incident-${inc.id}`}
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-16">
              <Swords size={40} className="text-primary/40" />
              <p className="uppercase tracking-wider text-sm">The hall is quiet</p>
              <p className="text-xs">No incidents recorded</p>
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
