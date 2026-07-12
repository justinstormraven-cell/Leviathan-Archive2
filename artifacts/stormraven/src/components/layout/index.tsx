import React from "react";
import { Link, useLocation } from "wouter";
import { Terminal, ShieldAlert, Server, Activity, Lock, Hash, Binary, Hammer } from "lucide-react";
import { useGetSystemMetrics } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const EMBLEM = `${import.meta.env.BASE_URL}nidelvir-mark.png`;

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: metrics } = useGetSystemMetrics({
    query: { refetchInterval: 5000, queryKey: ["/api/system/metrics"] }
  });

  const navItems = [
    { href: "/", label: "BIFROST", icon: Activity },
    { href: "/realms", label: "YGGDRASIL", icon: Server },
    { href: "/modules", label: "THE FORGE", icon: Hammer },
    { href: "/audit", label: "MIMIR", icon: ShieldAlert },
    { href: "/terminal", label: "GALDR", icon: Terminal },
    { href: "/kernel", label: "YMIR CORE", icon: Binary },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm z-40 flex items-center justify-between px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={EMBLEM}
              alt="Nidelvir emblem"
              className="w-10 h-10 rounded-full object-cover border border-primary/40 forge-glow shrink-0"
            />
            <div className="flex flex-col leading-none gap-0.5">
              <span className="text-[10px] tracking-[0.35em] text-primary/70 font-display font-bold">
                NIDELVIR
              </span>
              <span
                className="font-bold tracking-widest text-lg glitch-text font-display text-primary"
                data-text="STORMRAVEN OS"
              >
                STORMRAVEN OS
              </span>
              <span className="text-[9px] tracking-[0.28em] text-muted-foreground uppercase">
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
        <div className="flex items-center gap-6 text-xs font-mono hidden md:flex">
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
              <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase">UPTIME:</span>
                <span className="text-foreground">{metrics.uptimeSeconds}s</span>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-48 border-r border-border bg-card/50 flex flex-col z-30 shrink-0">
          <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
            {navItems.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block">
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

          <div className="p-4 border-t border-border mt-auto">
            <div className="text-xs text-muted-foreground flex flex-col gap-1">
              <span className="uppercase text-[10px] tracking-widest text-primary/70">NIDELVIR // CORE</span>
              <div className="flex items-center gap-2"><Hash size={10}/> v4.9.112-core</div>
              <div className="flex items-center gap-2"><Activity size={10}/> The Forge Burns</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 bg-background/90 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
