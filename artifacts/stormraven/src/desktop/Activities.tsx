import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { APPS, getApp } from "./appRegistry";
import { useDesktop } from "./DesktopContext";

export default function Activities() {
  const { openApp, setShowActivities, windows, focusWindow, workspace } = useDesktop();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowActivities(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setShowActivities]);

  const filtered = useMemo(
    () => APPS.filter((a) => a.name.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  const openWindows = windows.filter((w) => w.workspace === workspace);

  return (
    <div
      className="absolute inset-0 z-[9500] flex flex-col items-center pt-14 pb-8 px-6 bg-black/60 backdrop-blur-2xl"
      onClick={() => setShowActivities(false)}
    >
      {/* search */}
      <div
        className="relative w-full max-w-md mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              openApp(filtered[0].id);
            }
          }}
          placeholder="Type to search applications…"
          className="w-full rounded-full bg-white/10 border border-white/15 pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          data-testid="input-app-search"
        />
      </div>

      {/* open windows */}
      {openWindows.length > 0 && q === "" && (
        <div
          className="w-full max-w-4xl mb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] uppercase tracking-widest text-white/50 mb-2">
            Open windows
          </p>
          <div className="flex flex-wrap gap-3">
            {openWindows.map((w) => {
              const app = getApp(w.appId);
              const Icon = app?.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    focusWindow(w.id);
                    setShowActivities(false);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-foreground"
                  data-testid={`overview-win-${w.appId}`}
                >
                  {Icon && <Icon size={16} className="text-primary" />}
                  <span className="truncate max-w-[160px]">{w.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* app grid */}
      <div
        className="w-full max-w-4xl overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-4">
          {filtered.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 group"
                data-testid={`launch-${app.id}`}
              >
                <span
                  className={`w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br ${app.gradient} border border-white/10 group-hover:scale-105 transition-transform`}
                >
                  <Icon size={30} className="text-foreground" />
                </span>
                <span className="text-xs text-foreground/90 text-center leading-tight">
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-white/50 py-10">No applications found.</p>
        )}
      </div>
    </div>
  );
}
