import React, { useEffect, useState } from "react";
import { useGetRoeStatus, useAcceptRoe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollText, ShieldCheck, Check, Loader2 } from "lucide-react";
import { useAuth } from "./auth";

/**
 * Rules of Engagement gate. Once an operator holds a session token they must
 * acknowledge the ethical-hacking laws and confirm their authorized scope
 * before the desktop becomes usable. Acceptance is recorded server-side to the
 * Mimir audit ledger, so this only appears until the current RoE version has
 * been accepted.
 */
export default function RoeGate() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [ack, setAck] = useState(false);
  const [scope, setScope] = useState("");

  const { data, isLoading } = useGetRoeStatus({
    query: { enabled: !!token, queryKey: ["/api/roe/status"] },
  });

  const accept = useAcceptRoe({
    mutation: { onSuccess: () => qc.invalidateQueries() },
  });

  useEffect(() => {
    if (data && !scope) setScope(data.authorizedScope || data.defaultScope || "");
  }, [data, scope]);

  if (!token || isLoading || !data || data.accepted) return null;

  const canAccept = ack && scope.trim().length > 0 && !accept.isPending;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 font-sans">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto custom-scrollbar rounded-xl border border-primary/30 bg-background/90 p-6 sm:p-8 shadow-2xl ice-glow">
        <div className="flex items-center gap-3 border-b border-primary/30 pb-4">
          <ScrollText className="text-primary shrink-0" size={26} />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-foreground uppercase font-serif">
              Rules of Engagement
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
              Ethical operating charter · v{data.version}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          StormRaven OS operates strictly as a <span className="text-primary">defensive</span>{" "}
          instrument. Before crossing into the operator environment you must
          affirm the laws below and declare the boundary of your engagement.
        </p>

        <ol className="mt-4 space-y-2">
          {data.laws.map((law, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm text-foreground/90 border-l-2 border-primary/40 pl-3 py-1"
            >
              <span className="text-primary font-mono text-xs shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{law}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-primary">
            Authorized scope
          </label>
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 resize-none"
            placeholder="Describe the systems you are authorized to operate against…"
            data-testid="input-roe-scope"
          />
        </div>

        <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
            data-testid="checkbox-roe-ack"
          />
          <span className="text-sm text-foreground/90">
            I confirm I have explicit authorization for the scope above and will
            operate within these laws. All actions are logged.
          </span>
        </label>

        {accept.isError && (
          <p className="mt-3 text-destructive text-xs" data-testid="text-roe-error">
            Acceptance failed — the core is unreachable. Try again.
          </p>
        )}

        <button
          onClick={() =>
            accept.mutate({
              data: { scopeAcknowledged: ack, authorizedScope: scope.trim() },
            })
          }
          disabled={!canAccept}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="button-roe-accept"
        >
          {accept.isPending ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Sealing acceptance…
            </>
          ) : (
            <>
              <ShieldCheck size={16} /> Accept &amp; Enter the Forge
            </>
          )}
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--secondary)); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
      `}</style>
    </div>
  );
}
