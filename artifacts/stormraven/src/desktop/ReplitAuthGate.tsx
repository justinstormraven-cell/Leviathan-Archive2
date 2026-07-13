import { useAuth } from "@workspace/replit-auth-web";
import { Snowflake, LogIn, Loader2 } from "lucide-react";
import Desktop from "@/desktop/Desktop";

/**
 * Outer "front door" for StormRaven OS. A user must be signed in to reach the
 * desktop at all. The operator password gate (STORMRAVEN_PASSWORD) still
 * protects the dangerous apps (Terminal, Forge, Files write, Leviathan) inside.
 */
export default function ReplitAuthGate() {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-primary">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-cyan-950/40 text-foreground relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 w-[min(92vw,420px)] rounded-2xl border border-primary/20 bg-background/60 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-indigo-700/25 border border-primary/30">
              <Snowflake size={30} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-wide">STORMRAVEN OS</h1>
          <p className="text-[11px] font-mono text-primary/70 mt-1 tracking-[0.25em]">
            NIDELVIR · DYING STAR FORGE
          </p>
          <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
            The forge is sealed. Sign in to cross the Bifrost and enter the
            operator environment.
          </p>
          <button
            onClick={login}
            className="mt-7 w-full flex items-center justify-center gap-2 rounded-xl bg-primary/20 border border-primary/40 text-primary font-semibold py-3 hover:bg-primary/30 transition-colors"
            data-testid="button-login"
          >
            <LogIn size={17} /> Log in
          </button>
          <p className="mt-4 text-[10px] text-muted-foreground/50 leading-relaxed">
            Operator credentials are still required for the live shell and the
            Forge.
          </p>
        </div>
      </div>
    );
  }

  return <Desktop />;
}
