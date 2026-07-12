import React, { useEffect, useRef, useState } from "react";
import { Wifi, Volume2, Power, LayoutGrid, Lock, RotateCw, Circle } from "lucide-react";
import { useDesktop } from "./DesktopContext";
import { useAuth } from "./auth";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function TopBar() {
  const { showActivities, setShowActivities, workspace, setWorkspace, workspaceCount } =
    useDesktop();
  const { operator, logout, token } = useAuth();
  const now = useClock();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="absolute top-0 inset-x-0 h-8 z-[9000] flex items-center justify-between px-3 glass-strong border-b border-white/5 text-xs select-none">
      {/* left: activities */}
      <button
        onClick={() => setShowActivities(!showActivities)}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/10 ${
          showActivities ? "text-primary" : "text-foreground/90"
        }`}
        data-testid="button-activities"
      >
        <LayoutGrid size={13} />
        <span className="font-medium">Activities</span>
      </button>

      {/* center: clock */}
      <button
        onClick={() => setShowActivities(!showActivities)}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-0.5 rounded-md hover:bg-white/10 text-foreground/90"
      >
        <span className="text-muted-foreground">{date}</span>
        <span className="font-medium tabular-nums">{time}</span>
      </button>

      {/* right: indicators */}
      <div className="flex items-center gap-1">
        {/* workspaces */}
        <div className="flex items-center gap-1 mr-1">
          {Array.from({ length: workspaceCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setWorkspace(i)}
              title={`Workspace ${i + 1}`}
              className="p-0.5"
              data-testid={`workspace-${i}`}
            >
              <Circle
                size={8}
                className={
                  i === workspace ? "fill-primary text-primary" : "text-muted-foreground"
                }
              />
            </button>
          ))}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenu(!menu)}
            className="flex items-center gap-2 px-2 py-0.5 rounded-md hover:bg-white/10 text-foreground/90"
            data-testid="button-system-menu"
          >
            <Wifi size={13} />
            <Volume2 size={13} />
            <Power size={13} />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 w-56 glass-strong rounded-lg border border-white/10 shadow-2xl shadow-black/60 p-2 text-sm">
              <div className="px-2 py-1.5 border-b border-white/10 mb-1">
                <p className="text-foreground font-medium truncate">
                  {operator ?? "Guest operator"}
                </p>
                <p className="text-[11px] text-muted-foreground">StormRaven OS · Glacier</p>
              </div>
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Wifi size={14} className="text-primary" /> Network
                </span>
                <span className="text-[11px] text-success">Connected</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Volume2 size={14} className="text-primary" /> Sound
                </span>
                <span className="text-[11px]">100%</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              {token && (
                <button
                  onClick={() => {
                    logout();
                    setMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-foreground"
                  data-testid="menu-lock"
                >
                  <Lock size={14} className="text-primary" /> Lock session
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-foreground"
                data-testid="menu-restart"
              >
                <RotateCw size={14} className="text-primary" /> Restart shell
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
