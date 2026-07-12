import React from "react";
import { LayoutGrid } from "lucide-react";
import { APPS } from "./appRegistry";
import { useDesktop } from "./DesktopContext";
import { useIsMobile } from "./useIsMobile";

export default function Dock() {
  const { openApp, windows, activeId, showActivities, setShowActivities, workspace } =
    useDesktop();
  const isMobile = useIsMobile();
  const dockApps = APPS.filter((a) => a.dock);

  const runningIds = new Set(windows.map((w) => w.appId));
  const activeAppId = windows.find((w) => w.id === activeId)?.appId;

  const container = isMobile
    ? "fixed bottom-0 inset-x-0 z-[8000] flex flex-row items-center gap-1 px-2 py-1.5 glass-strong border-t border-white/10 overflow-x-auto"
    : "absolute left-2 top-1/2 -translate-y-1/2 z-[8000] flex flex-col items-center gap-1.5 p-2 rounded-2xl glass-strong border border-white/10 shadow-2xl shadow-black/50";

  const btn = isMobile
    ? "group relative w-11 h-11 shrink-0 rounded-xl grid place-items-center hover:bg-white/10 transition-colors"
    : "group relative w-12 h-12 rounded-xl grid place-items-center hover:bg-white/10 transition-colors";

  return (
    <div className={container}>
      {dockApps.map((app) => {
        const Icon = app.icon;
        const running = runningIds.has(app.id);
        const isActive =
          activeAppId === app.id &&
          windows.some(
            (w) => w.appId === app.id && w.workspace === workspace && !w.minimized,
          );
        return (
          <button
            key={app.id}
            onClick={() => openApp(app.id)}
            className={btn}
            data-testid={`dock-${app.id}`}
          >
            <span
              className={`absolute inset-1 rounded-xl bg-gradient-to-br ${app.gradient} opacity-70 group-hover:opacity-100 transition-opacity`}
            />
            <Icon size={isMobile ? 20 : 22} className="relative text-foreground" />
            {running &&
              (isMobile ? (
                <span
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all ${
                    isActive ? "w-6 bg-primary" : "w-2.5 bg-primary/60"
                  }`}
                />
              ) : (
                <span
                  className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all ${
                    isActive ? "h-6 bg-primary" : "h-2.5 bg-primary/60"
                  }`}
                />
              ))}
            {!isMobile && (
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
                {app.name}
              </span>
            )}
          </button>
        );
      })}

      <div
        className={isMobile ? "w-px h-8 bg-white/10 mx-1 shrink-0" : "w-8 h-px bg-white/10 my-1"}
      />

      <button
        onClick={() => setShowActivities(!showActivities)}
        className={`${btn} ${showActivities ? "bg-white/10" : ""}`}
        data-testid="dock-apps"
      >
        <LayoutGrid size={isMobile ? 20 : 22} className="text-primary" />
        {!isMobile && (
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
            Show Applications
          </span>
        )}
      </button>
    </div>
  );
}
