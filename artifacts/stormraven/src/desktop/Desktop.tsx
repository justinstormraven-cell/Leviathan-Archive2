import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesktopContext } from "./DesktopContext";
import { AuthProvider } from "./auth";
import { getApp } from "./appRegistry";
import WindowFrame from "./WindowFrame";
import TopBar from "./TopBar";
import Dock from "./Dock";
import Activities from "./Activities";
import { useIsMobile } from "./useIsMobile";
import type { Rect, WinInstance } from "./types";
import {
  applyAccent,
  savedAccentId,
  savedWallpaperId,
  wallpaperCss,
  WALLPAPER_EVENT,
} from "./theme";

const WORKSPACE_COUNT = 4;
const TOPBAR_H = 32;
const MOBILE_DOCK_H = 60;

export default function Desktop() {
  return (
    <AuthProvider>
      <DesktopShell />
    </AuthProvider>
  );
}

function DesktopShell() {
  const [windows, setWindows] = useState<WinInstance[]>([]);
  const [workspace, setWorkspace] = useState(0);
  const [showActivities, setShowActivities] = useState(false);
  const [area, setArea] = useState({ width: 1280, height: 720 });
  const [wallId, setWallId] = useState(() => savedWallpaperId());
  const isMobile = useIsMobile();

  const zCounter = useRef(10);
  const idCounter = useRef(0);
  const layerRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  // apply saved accent + react to wallpaper changes from Settings
  useEffect(() => {
    applyAccent(savedAccentId());
    const onWall = (e: Event) => setWallId((e as CustomEvent<string>).detail);
    window.addEventListener(WALLPAPER_EVENT, onWall);
    return () => window.removeEventListener(WALLPAPER_EVENT, onWall);
  }, []);

  // measure the windows layer for bounds + maximize
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setArea({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setArea({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const activeId = useMemo(() => {
    const vis = windows.filter((w) => w.workspace === workspace && !w.minimized);
    if (!vis.length) return null;
    return vis.reduce((a, b) => (b.z > a.z ? b : a)).id;
  }, [windows, workspace]);

  const openApp = useCallback(
    (appId: string, payload?: Record<string, unknown>) => {
      const app = getApp(appId);
      if (!app) return;
      setShowActivities(false);
      const z = (zCounter.current += 1);
      setWindows((prev) => {
        const existing = prev.find((w) => w.appId === appId);
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id
              ? { ...w, minimized: false, workspace, z, payload: payload ?? w.payload }
              : w,
          );
        }
        const id = `w${(idCounter.current += 1)}`;
        const count = prev.length;
        const width = Math.min(app.defaultSize.width, Math.max(340, area.width - 40));
        const height = Math.min(app.defaultSize.height, Math.max(220, area.height - 40));
        const x = Math.min(Math.max(0, area.width - width), 60 + ((count * 30) % 220));
        const y = Math.min(Math.max(0, area.height - height), 30 + ((count * 30) % 150));
        return [
          ...prev,
          {
            id,
            appId,
            title: app.name,
            x,
            y,
            width,
            height,
            z,
            minimized: false,
            maximized: false,
            workspace,
            payload,
          },
        ];
      });
    },
    [workspace, area],
  );

  const focusWindow = useCallback((id: string) => {
    const z = (zCounter.current += 1);
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
    );
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const r = w.restore;
          return { ...w, maximized: false, ...(r ?? {}) };
        }
        const restore: Rect = { x: w.x, y: w.y, width: w.width, height: w.height };
        return { ...w, maximized: true, restore };
      }),
    );
  }, []);

  const updateRect = useCallback((id: string, rect: Rect) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id && !w.maximized ? { ...w, ...rect } : w)),
    );
  }, []);

  // open a window on first boot so the desktop isn't empty
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    openApp("bifrost");
  }, [openApp]);

  const api = useMemo(
    () => ({
      windows,
      activeId,
      openApp,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      updateRect,
      workspace,
      setWorkspace,
      workspaceCount: WORKSPACE_COUNT,
      showActivities,
      setShowActivities,
    }),
    [
      windows,
      activeId,
      openApp,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      updateRect,
      workspace,
      showActivities,
    ],
  );

  return (
    <DesktopContext.Provider value={api}>
      <div
        className="fixed inset-0 overflow-hidden font-sans"
        style={{ background: wallpaperCss(wallId), backgroundSize: "cover" }}
      >
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <TopBar />

        {/* windows layer (below the top bar) */}
        <div
          ref={layerRef}
          className="absolute inset-x-0"
          style={{ top: TOPBAR_H, bottom: isMobile ? MOBILE_DOCK_H : 0 }}
        >
          {windows
            .filter((w) => w.workspace === workspace)
            .map((w) => (
              <WindowFrame key={w.id} win={w} area={area} />
            ))}
        </div>

        <Dock />

        {showActivities && <Activities />}
      </div>
    </DesktopContext.Provider>
  );
}
