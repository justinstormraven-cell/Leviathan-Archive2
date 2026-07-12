import React, { useRef, useState, useEffect } from "react";
import { useLogin } from "@workspace/api-client-react";
import { Lock } from "lucide-react";
import { useAuth } from "../auth";

const EMBLEM = `${import.meta.env.BASE_URL}nidelvir-mark.png`;

function status(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

export default function LoginGate({
  title = "StormRaven OS",
  subtitle = "Operator authentication required",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doLogin = useLogin({
    mutation: {
      onSuccess: (res) => {
        setError(null);
        login(res.token);
      },
      onError: (err) => {
        const s = status(err);
        setError(
          s === 401
            ? "Access denied — invalid credentials"
            : s === 503
              ? "No operator seal configured on this host"
              : "Authentication failed — core unreachable",
        );
      },
    },
  });

  const submit = () => {
    if (!password.trim() || doLogin.isPending) return;
    doLogin.mutate({ data: { password } });
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-primary/25 bg-black/40 p-8 ice-glow">
        <img
          src={EMBLEM}
          alt="StormRaven"
          className="w-20 h-20 mx-auto rounded-full border border-primary/40 object-cover forge-glow select-none"
          draggable={false}
        />
        <div className="text-center space-y-1">
          <h2 className="text-lg font-medium tracking-wide text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock size={12} className="text-primary" /> {subtitle}
          </p>
        </div>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            disabled={doLogin.isPending}
            className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            autoComplete="off"
            spellCheck={false}
            data-testid="input-password"
          />
          {error && (
            <p className="text-destructive text-xs" data-testid="text-login-error">
              {error}
            </p>
          )}
          <button
            onClick={submit}
            disabled={doLogin.isPending || !password.trim()}
            className="w-full rounded-md bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-medium py-2 transition-colors disabled:opacity-40"
            data-testid="button-login"
          >
            {doLogin.isPending ? "Authenticating…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
