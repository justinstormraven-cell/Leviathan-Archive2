import React, { useEffect, useRef, useState } from "react";
import { Waves, Send, CornerDownLeft } from "lucide-react";
import { useLeviathanChat } from "@workspace/api-client-react";
import { useAuth } from "../auth";
import LoginGate from "./LoginGate";

type ChatMessage = { role: "user" | "assistant"; content: string };

function status(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

const GREETING =
  "I am Leviathan — the intelligence fused into this forge. I watch the realms, the modules, and the current beneath them. Ask, and I will answer.";

export default function Leviathan() {
  const { token } = useAuth();
  if (!token)
    return (
      <LoginGate
        title="Leviathan"
        subtitle="Authenticate to commune with the operator intelligence"
      />
    );
  return <Console />;
}

function Console() {
  const { logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = useLeviathanChat({
    mutation: {
      onSuccess: (data) => {
        setErrorMsg(null);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      },
      onError: (err) => {
        if (status(err) === 401) {
          logout();
          return;
        }
        const detail =
          (err as { data?: { error?: string } } | null)?.data?.error ??
          "The link to Leviathan faltered. Try again.";
        setErrorMsg(detail);
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chat.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setErrorMsg(null);
    chat.mutate({ data: { messages: next } });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-cyan-950/40 text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/20 bg-background/40 shrink-0">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br from-cyan-400/30 to-indigo-700/30 border border-primary/30">
          <Waves size={18} className="text-primary" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-wide">Leviathan</div>
          <div className="text-[11px] text-primary/70 font-mono">
            OPERATOR INTELLIGENCE · LINK ACTIVE
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="leviathan-log">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center space-y-4 pt-8">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-700/20 border border-primary/25">
                <Waves size={30} className="text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{GREETING}</p>
            <p className="text-[11px] text-muted-foreground/60">
              Replies are generated via Replit&apos;s managed AI and draw on your Replit credits.
            </p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/15 border border-primary/25 px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3 items-start">
              <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400/25 to-indigo-700/25 border border-primary/25 shrink-0">
                <Waves size={14} className="text-primary" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-background/50 border border-border px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {m.content}
              </div>
            </div>
          ),
        )}

        {chat.isPending && (
          <div className="flex gap-3 items-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400/25 to-indigo-700/25 border border-primary/25 shrink-0">
              <Waves size={14} className="text-primary animate-pulse" />
            </div>
            <span className="text-sm text-muted-foreground italic animate-pulse">
              Leviathan surfaces from the deep…
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-primary/20 bg-background/40 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Speak to Leviathan…"
            disabled={chat.isPending}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm max-h-40 py-1 disabled:opacity-60"
            data-testid="input-leviathan"
          />
          <button
            onClick={send}
            disabled={chat.isPending || !input.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 text-primary disabled:opacity-40 hover:bg-primary/30 transition-colors shrink-0"
            data-testid="button-send"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[10px] text-muted-foreground/50 flex items-center gap-1">
          <CornerDownLeft size={11} /> Enter to send · Shift+Enter for a new line
        </div>
      </div>
    </div>
  );
}
