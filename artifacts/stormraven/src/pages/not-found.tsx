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
            <h1 className="text-2xl font-bold tracking-widest text-destructive uppercase glitch-text" data-text="404: DIRECTORY NOT FOUND">
              404: DIRECTORY NOT FOUND
            </h1>
            <p className="text-muted-foreground font-mono">
              <span className="text-primary">{location}</span> is restricted or non-existent in current realm matrix.
            </p>
          </div>
          <div className="pt-4 text-xs text-muted-foreground uppercase border-t border-border">
            ACCESS DENIED // LOGGING ATTEMPT
          </div>
        </TerminalCard>
      </div>
    </Layout>
  );
}
