import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Server, Activity, Lock, Hash, Binary, Hammer, Menu, X } from "lucide-react";
import { useGetSystemMetrics } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useInWindow } from "@/desktop/chrome-context";

interface LayoutProps {
  children: React.ReactNode;
}

const EMBLEM = `${import.meta.env.BASE_URL}nidelvir-mark.png`;

const NAV_ITEMS = [
  { href: "/", label: "BIFROST", icon: Activity },
  { href: "/realms", label: "YGGDRASIL", icon: Server },
  { href: "/modules", label: "THE FORGE", icon: Hammer },
  { href: "/audit", label: "MIMIR", icon: ShieldAlert },
  { href: "/terminal", label: "GALDR", icon: Terminal },
  { href: "/kernel", label: "YMIR CORE", icon: Binary },
] as const;

function NavLinks({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const active = location === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="block" onClick={onNavigate}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer group uppercase text-sm tracking-wider font-semibold",
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-2 border-transparent"
              )}
            >
              <Icon size={16} className={cn("group-hover:text-primary transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="p-4 border-t border-border mt-auto">
      <div className="text-xs text-muted-foreground flex flex-col gap-1">
        <span className="uppercase text-[10px] tracking-widest text-primary/70">NIDELVIR // CORE</span>
        <div className="flex items-center gap-2"><Hash size={10} /> v4.9.112-core</div>
        <div className="flex items-center gap-2"><Activity size={10} /> The Forge Burns</div>
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const inWindow = useInWindow();
  const { data: metrics } = useGetSystemMetrics({
    query: { refetchInterval: 5000, queryKey: ["/api/system/metrics"] }
  });

  // When rendered inside a desktop window, drop the full-screen chrome
  // (header + sidebar) and behave as a plain scrolling content pane.
  if (inWindow) {
    return (
      <div className="h-full overflow-y-auto bg-transparent p-4 sm:p-6">
        {children}
      </div>
    );
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm z-40 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-primary transition-colors p-1 -ml-1 shrink-0"
            aria-label="Open navigation"
            data-testid="button-open-nav"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src={EMBLEM}
              alt="Nidelvir emblem"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-primary/40 forge-glow shrink-0"
            />
            <div className="flex flex-col leading-none gap-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] tracking-[0.35em] text-primary/70 font-display font-bold">
                NIDELVIR
              </span>
              <span
                className="font-bold tracking-widest text-base sm:text-lg glitch-text font-display text-primary truncate"
                data-text="STORMRAVEN OS"
              >
                STORMRAVEN OS
              </span>
              <span className="hidden sm:block text-[9px] tracking-[0.28em] text-muted-foreground uppercase">
                The Dying Star Forge
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-2 hidden lg:block" />
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase">Smith:</span>
            <span className="text-primary font-bold tracking-wider">LUCI STORMRAVEN</span>
          </div>
        </div>

        {/* Global Metrics Banner */}
        <div className="hidden md:flex items-center gap-3 lg:gap-6 text-xs font-mono shrink-0">
          {metrics && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">Threat:</span>
                <span className={cn(
                  "font-bold uppercase tracking-wider",
                  metrics.threatLevel === 'ELEVATED' || metrics.threatLevel === 'CRITICAL' ? 'text-destructive animate-pulse' : 'text-primary'
                )}>
                  {metrics.threatLevel}
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">Rune:</span>
                <span className="text-warning flex items-center gap-1">
                  <Lock size={12} />
                  {metrics.authLevel}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">MEM:</span>
                <span className="text-foreground">{metrics.memoryPercent.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">CPU:</span>
                <span className="text-foreground">{metrics.cpuPercent.toFixed(1)}%</span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">UPTIME:</span>
                <span className="text-foreground">{metrics.uptimeSeconds}s</span>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-48 border-r border-border bg-card/50 flex-col z-30 shrink-0">
          <NavLinks location={location} />
          <SidebarFooter />
        </aside>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[82%] bg-card border-r border-border flex flex-col shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-[10px] tracking-[0.35em] text-primary/70 font-display font-bold uppercase">
                  Nidelvir
                </span>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Close navigation"
                  data-testid="button-close-nav"
                >
                  <X size={20} />
                </button>
              </div>
              <NavLinks location={location} onNavigate={() => setNavOpen(false)} />
              <SidebarFooter />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 bg-background/90 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
