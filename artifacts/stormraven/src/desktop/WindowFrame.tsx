import React from "react";
import { Rnd } from "react-rnd";
import { Minus, X, Square, Copy } from "lucide-react";
import { getApp } from "./appRegistry";
import { useDesktop } from "./DesktopContext";
import { InWindowContext } from "./chrome-context";
import { useIsMobile } from "./useIsMobile";
import type { WinInstance } from "./types";

export default function WindowFrame({
  win,
  area,
}: {
  win: WinInstance;
  area: { width: number; height: number };
}) {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, updateRect, activeId } =
    useDesktop();
  const isMobile = useIsMobile();
  const app = getApp(win.appId);
  if (!app) return null;
  const Component = app.component;
  const Icon = app.icon;
  const active = activeId === win.id;
  const fill = isMobile || win.maximized;

  const inner = (
    <div
      className={`flex flex-col h-full w-full overflow-hidden glass-strong border ${
        fill ? "rounded-none" : "rounded-xl"
      } ${
        active
          ? "border-primary/50 shadow-2xl shadow-black/60 ring-1 ring-primary/30"
          : "border-white/5 shadow-xl shadow-black/40"
      }`}
    >
      {/* title bar */}
      <div
        className="win-drag flex items-center gap-2 h-10 sm:h-9 px-3 shrink-0 bg-white/[0.03] border-b border-white/5 cursor-default select-none"
        onDoubleClick={() => !isMobile && toggleMaximize(win.id)}
      >
        <Icon size={14} className="text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground/90 truncate flex-1">
          {win.title}
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            className="w-8 h-8 sm:w-6 sm:h-6 grid place-items-center rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
            title="Minimize"
            data-testid={`win-min-${win.appId}`}
          >
            <Minus size={14} />
          </button>
          {!isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize(win.id);
              }}
              className="w-6 h-6 grid place-items-center rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
              title={win.maximized ? "Restore" : "Maximize"}
              data-testid={`win-max-${win.appId}`}
            >
              {win.maximized ? <Copy size={11} /> : <Square size={11} />}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            className="w-8 h-8 sm:w-6 sm:h-6 grid place-items-center rounded-md hover:bg-destructive/80 text-muted-foreground hover:text-white"
            title="Close"
            data-testid={`win-close-${win.appId}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 min-h-0 bg-background/60">
        <InWindowContext.Provider value={true}>
          <Component win={win} />
        </InWindowContext.Provider>
      </div>
    </div>
  );

  // Mobile: every window is a fullscreen sheet; no drag/resize.
  if (isMobile) {
    return (
      <div
        className="absolute inset-0"
        style={{ zIndex: win.z, display: win.minimized ? "none" : undefined }}
        onMouseDown={() => focusWindow(win.id)}
        onTouchStart={() => focusWindow(win.id)}
      >
        {inner}
      </div>
    );
  }

  const size = win.maximized
    ? { width: area.width, height: area.height }
    : { width: win.width, height: win.height };
  const position = win.maximized ? { x: 0, y: 0 } : { x: win.x, y: win.y };

  return (
    <Rnd
      size={size}
      position={position}
      bounds="parent"
      dragHandleClassName="win-drag"
      minWidth={340}
      minHeight={220}
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      style={{ zIndex: win.z, display: win.minimized ? "none" : undefined }}
      onMouseDown={() => focusWindow(win.id)}
      onDragStart={() => focusWindow(win.id)}
      onDragStop={(_e, d) =>
        updateRect(win.id, { x: d.x, y: d.y, width: win.width, height: win.height })
      }
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        updateRect(win.id, {
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
    >
      {inner}
    </Rnd>
  );
}
