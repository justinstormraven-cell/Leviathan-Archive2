import React, { useEffect, useRef, useState } from "react";
import {
  useExecuteCommand,
  useGetTerminalHistory,
  getGetTerminalHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import LoginGate from "./LoginGate";

const PROMPT = "luci@nidelvir:~#";

function status(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

export default function TerminalApp() {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Terminal" subtitle="Authenticate for a live root shell" />;
  return <Shell />;
}

function Shell() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clearedId, setClearedId] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: serverHistory, isLoading, error } = useGetTerminalHistory({
    query: { queryKey: getGetTerminalHistoryQueryKey() },
  });

  useEffect(() => {
    if (status(error) === 401) logout();
  }, [error, logout]);

  const executeCommand = useExecuteCommand({
    mutation: {
      onSuccess: (newResult) => {
        queryClient.setQueryData(getGetTerminalHistoryQueryKey(), (old: unknown) => {
          const list = Array.isArray(old) ? old : [];
          return [...list, newResult];
        });
      },
      onError: (err) => {
        if (status(err) === 401) logout();
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [serverHistory, executeCommand.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const visible = (serverHistory ?? []).filter((h) => h.id > clearedId);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = input.trim();
      if (!cmd) return;
      if (cmd === "clear") {
        const lastId = serverHistory?.length ? serverHistory[serverHistory.length - 1].id : 0;
        setClearedId(lastId);
        setInput("");
        setHistoryIndex(-1);
        return;
      }
      executeCommand.mutate({ data: { command: cmd } });
      setInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cmds = (serverHistory ?? []).map((h) => h.command);
      if (cmds.length) {
        const i = historyIndex < cmds.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(i);
        setInput(cmds[cmds.length - 1 - i]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cmds = (serverHistory ?? []).map((h) => h.command);
      if (historyIndex > 0) {
        const i = historyIndex - 1;
        setHistoryIndex(i);
        setInput(cmds[cmds.length - 1 - i]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col font-mono text-sm bg-black/70 text-foreground"
      onClick={() => inputRef.current?.focus()}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        data-testid="terminal-output"
      >
        <div className="text-muted-foreground text-xs mb-2">
          {"> StormRaven live root shell — commands run directly on the host."}
          <br />
          {"> Try: ls, pwd, uname -a, ps, df -h. Type 'clear' to reset."}
        </div>
        {isLoading && <div className="animate-pulse">Opening session…</div>}
        {visible.map((h) => (
          <div key={h.id} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">{PROMPT}</span>
              <span className="break-all">{h.command}</span>
            </div>
            {h.output && (
              <div
                className={`whitespace-pre-wrap break-all ${
                  h.exitCode !== 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {h.output}
              </div>
            )}
          </div>
        ))}
        {executeCommand.isPending && (
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">{PROMPT}</span>
            <span>{executeCommand.variables?.data.command}</span>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-primary/20 bg-background/40 flex items-center gap-2 shrink-0">
        <span className="text-primary font-bold whitespace-nowrap">{PROMPT}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={executeCommand.isPending}
          className="flex-1 bg-transparent border-none outline-none text-foreground w-full"
          autoComplete="off"
          spellCheck={false}
          data-testid="input-command"
        />
        {executeCommand.isPending && (
          <span className="animate-pulse block w-2 h-4 bg-primary" />
        )}
      </div>
    </div>
  );
}
