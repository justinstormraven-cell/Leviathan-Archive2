export type AppId = string;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WinInstance extends Rect {
  id: string;
  appId: AppId;
  title: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  workspace: number;
  payload?: Record<string, unknown>;
  restore?: Rect;
}

export interface DesktopApi {
  windows: WinInstance[];
  activeId: string | null;
  openApp: (appId: AppId, payload?: Record<string, unknown>) => void;
  focusWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  updateRect: (id: string, rect: Rect) => void;
  workspace: number;
  setWorkspace: (n: number) => void;
  workspaceCount: number;
  showActivities: boolean;
  setShowActivities: (b: boolean) => void;
}
