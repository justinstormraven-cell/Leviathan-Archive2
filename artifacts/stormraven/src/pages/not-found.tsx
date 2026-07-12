import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { TerminalCard } from "@/components/ui/terminal-components";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <Layout>
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <TerminalCard variant="destructive" className="max-w-md w-full text-center p-8 space-y-6">
          <ShieldAlert size={48} className="mx-auto text-destructive animate-pulse" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-widest text-destructive uppercase glitch-text font-serif" data-text="404 — REALM UNCHARTED">
              404 — REALM UNCHARTED
            </h1>
            <p className="text-muted-foreground font-mono">
              <span className="text-primary">{location}</span> hangs from no branch of Yggdrasil.
            </p>
          </div>
          <div className="pt-4 text-xs text-muted-foreground uppercase border-t border-border">
            MIMIR RECORDS THIS TRESPASS
          </div>
        </TerminalCard>
      </div>
    </Layout>
  );
}
