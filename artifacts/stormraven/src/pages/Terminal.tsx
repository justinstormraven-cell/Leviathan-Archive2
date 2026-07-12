import React, { useState, useEffect, useRef } from "react";
import Layout from "@/components/layout";
import { TerminalCard } from "@/components/ui/terminal-components";
import {
  useExecuteCommand,
  useGetTerminalHistory,
  useLogin,
  getGetTerminalHistoryQueryKey,
} from "@workspace/api-client-react";
import { Terminal as TerminalIcon, Lock, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const TOKEN_KEY = "stormraven_token";
const EMBLEM = `${import.meta.env.BASE_URL}nidelvir-emblem.png`;
const PROMPT = "luci@nidelvir:~#";

function getErrStatus(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

export default function Terminal() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <Layout>
      <div className="h-full flex flex-col max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest text-foreground uppercase border-b-2 border-primary pb-2 inline-block glitch-text font-serif"
              data-text="GALDR"
            >
              GALDR
            </h1>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              Spoken Runes — Live Root Shell
            </p>
          </div>
          <div className="flex items-center gap-3">
            {token && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                data-testid="button-logout"
              >
                <LogOut size={14} /> Seal
              </button>
            )}
            <TerminalIcon size={32} className="text-primary opacity-50" />
          </div>
        </div>

        {token ? (
          <Shell onUnauthorized={handleLogout} />
        ) : (
          <LoginScreen onAuthenticated={setToken} />
        )}
      </div>
    </Layout>
  );
}

function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const login = useLogin({
    mutation: {
      onSuccess: (res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        setError(null);
        queryClient.invalidateQueries({
          queryKey: getGetTerminalHistoryQueryKey(),
        });
        onAuthenticated(res.token);
      },
      onError: (err) => {
        const status = getErrStatus(err);
        setError(
          status === 401
            ? "THE FORGE REJECTS YOU — invalid smith credentials"
            : status === 503
              ? "No smith seal is configured on the forge"
              : "Binding failed — connection to the core lost",
        );
      },
    },
  });

  const submit = () => {
    if (!password.trim() || login.isPending) return;
    login.mutate({ data: { password } });
  };

  return (
    <TerminalCard className="flex-1 flex items-center justify-center font-mono bg-black/90 border-primary/30">
      <div className="w-full max-w-md p-8 space-y-6">
        <img
          src={EMBLEM}
          alt="Nidelvir — The Dying Star Forge"
          className="w-full max-w-xs mx-auto forge-glow select-none pointer-events-none"
          draggable={false}
        />
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Lock size={16} />
            <span className="uppercase tracking-widest text-sm font-bold font-serif">
              Sealed Forge — Smith Rites Required
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a live root shell into the Nidelvir core. Only the smith may strike.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 border border-primary/30 bg-background/50 px-3 py-2">
            <span className="text-primary font-bold text-sm">seal:</span>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={login.isPending}
              className="flex-1 bg-transparent border-none outline-none text-foreground font-mono focus:ring-0"
              autoComplete="off"
              spellCheck={false}
              data-testid="input-password"
            />
          </div>

          {error && (
            <div className="text-destructive text-xs uppercase tracking-wide" data-testid="text-login-error">
              {"> "}
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={login.isPending || !password.trim()}
            className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-40 text-primary uppercase tracking-widest text-sm py-2 transition-colors font-serif"
            data-testid="button-login"
          >
            {login.isPending ? "Binding…" : "Strike The Forge"}
          </button>
        </div>
      </div>
    </TerminalCard>
  );
}

function Shell({ onUnauthorized }: { onUnauthorized: () => void }) {
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
    if (getErrStatus(error) === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  const executeCommand = useExecuteCommand({
    mutation: {
      onSuccess: (newResult) => {
        queryClient.setQueryData(
          getGetTerminalHistoryQueryKey(),
          (old: unknown) => {
            const list = Array.isArray(old) ? old : [];
            return [...list, newResult];
          },
        );
      },
      onError: (err) => {
        if (getErrStatus(err) === 401) onUnauthorized();
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [serverHistory, executeCommand.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const visible = (serverHistory ?? []).filter((h) => h.id > clearedId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = input.trim();
      if (!cmd) return;

      if (cmd === "clear") {
        const lastId = serverHistory?.length
          ? serverHistory[serverHistory.length - 1].id
          : 0;
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
      const commands = (serverHistory ?? []).map((h) => h.command);
      if (commands.length > 0) {
        const nextIndex =
          historyIndex < commands.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIndex);
        setInput(commands[commands.length - 1 - nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const commands = (serverHistory ?? []).map((h) => h.command);
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commands[commands.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <TerminalCard
      className="flex-1 flex flex-col font-mono text-sm bg-black/90 p-0 border-primary/30"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="bg-secondary/50 border-b border-border p-2 flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest shrink-0">
        <div className="w-3 h-3 rounded-full bg-destructive"></div>
        <div className="w-3 h-3 rounded-full bg-warning"></div>
        <div className="w-3 h-3 rounded-full bg-success"></div>
        <span className="ml-2">galdr — luci@nidelvir (live)</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-foreground"
      >
        <div className="text-muted-foreground mb-4 text-xs">
          {"> NIDELVIR LIVE ROOT SHELL — runes strike directly on the forge host"}
          <br />
          {"> Speak any real command (ls, pwd, cat, ps, df, uname -a). 'clear' cools the screen."}
        </div>

        {isLoading && <div className="animate-pulse">Kindling session…</div>}

        {visible.map((h) => (
          <div key={h.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">{PROMPT}</span>
              <span className="text-foreground break-all">{h.command}</span>
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
            <span className="text-foreground">{executeCommand.variables?.data.command}</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-primary/20 bg-background/50 flex items-center gap-2 shrink-0">
        <span className="text-primary font-bold whitespace-nowrap">{PROMPT}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={executeCommand.isPending}
          className="flex-1 bg-transparent border-none outline-none text-foreground font-mono focus:ring-0 w-full"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          data-testid="input-command"
        />
        {executeCommand.isPending && (
          <span className="animate-pulse block w-2 h-4 bg-primary"></span>
        )}
      </div>
    </TerminalCard>
  );
}
