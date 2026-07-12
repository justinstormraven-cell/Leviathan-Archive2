import React from "react";
import { LayoutGrid } from "lucide-react";
import { APPS } from "./appRegistry";
import { useDesktop } from "./DesktopContext";

export default function Dock() {
  const { openApp, windows, activeId, showActivities, setShowActivities, workspace } =
    useDesktop();
  const dockApps = APPS.filter((a) => a.dock);

  const runningIds = new Set(windows.map((w) => w.appId));
  const activeAppId = windows.find((w) => w.id === activeId)?.appId;

  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[8000] flex flex-col items-center gap-1.5 p-2 rounded-2xl glass-strong border border-white/10 shadow-2xl shadow-black/50">
      {dockApps.map((app) => {
        const Icon = app.icon;
        const running = runningIds.has(app.id);
        const isActive =
          activeAppId === app.id &&
          windows.some((w) => w.appId === app.id && w.workspace === workspace && !w.minimized);
        return (
          <button
            key={app.id}
            onClick={() => openApp(app.id)}
            className="group relative w-12 h-12 rounded-xl grid place-items-center hover:bg-white/10 transition-colors"
            data-testid={`dock-${app.id}`}
          >
            <span
              className={`absolute inset-1 rounded-xl bg-gradient-to-br ${app.gradient} opacity-70 group-hover:opacity-100 transition-opacity`}
            />
            <Icon size={22} className="relative text-foreground" />
            {running && (
              <span
                className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all ${
                  isActive ? "h-6 bg-primary" : "h-2.5 bg-primary/60"
                }`}
              />
            )}
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
              {app.name}
            </span>
          </button>
        );
      })}

      <div className="w-8 h-px bg-white/10 my-1" />

      <button
        onClick={() => setShowActivities(!showActivities)}
        className={`group relative w-12 h-12 rounded-xl grid place-items-center hover:bg-white/10 ${
          showActivities ? "bg-white/10" : ""
        }`}
        data-testid="dock-apps"
      >
        <LayoutGrid size={22} className="text-primary" />
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
          Show Applications
        </span>
      </button>
    </div>
  );
}
