import type React from "react";
import {
  FolderOpen,
  SquareTerminal,
  FileText,
  Activity,
  Package,
  Settings as SettingsIcon,
  LayoutDashboard,
  Server,
  Hammer,
  ShieldAlert,
  Binary,
  Waves,
  Radar,
  Fingerprint,
  Swords,
  Scale,
} from "lucide-react";

import Files from "./apps/Files";
import TerminalApp from "./apps/TerminalApp";
import TextEditor from "./apps/TextEditor";
import SystemMonitor from "./apps/SystemMonitor";
import Software from "./apps/Software";
import Settings from "./apps/Settings";
import Leviathan from "./apps/Leviathan";

import Dashboard from "@/pages/Dashboard";
import Realms from "@/pages/Realms";
import Modules from "@/pages/Modules";
import AuditLog from "@/pages/AuditLog";
import Kernel from "@/pages/Kernel";
import Huginn from "@/pages/Huginn";
import Heimdallr from "@/pages/Heimdallr";
import Valkyrie from "@/pages/Valkyrie";
import Logberg from "@/pages/Logberg";

import type { WinInstance } from "./types";

export interface AppDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  component: React.ComponentType<{ win?: WinInstance }>;
  defaultSize: { width: number; height: number };
  dock: boolean;
  category: "System" | "Utilities" | "Nidelvir";
}

export const APPS: AppDef[] = [
  {
    id: "files",
    name: "Files",
    icon: FolderOpen,
    gradient: "from-sky-400/30 to-blue-600/20",
    component: Files,
    defaultSize: { width: 780, height: 520 },
    dock: true,
    category: "System",
  },
  {
    id: "terminal",
    name: "Terminal",
    icon: SquareTerminal,
    gradient: "from-cyan-400/30 to-slate-700/30",
    component: TerminalApp,
    defaultSize: { width: 720, height: 480 },
    dock: true,
    category: "System",
  },
  {
    id: "editor",
    name: "Text Editor",
    icon: FileText,
    gradient: "from-teal-400/30 to-cyan-700/20",
    component: TextEditor,
    defaultSize: { width: 720, height: 520 },
    dock: true,
    category: "Utilities",
  },
  {
    id: "monitor",
    name: "System Monitor",
    icon: Activity,
    gradient: "from-blue-400/30 to-indigo-600/20",
    component: SystemMonitor,
    defaultSize: { width: 760, height: 540 },
    dock: true,
    category: "System",
  },
  {
    id: "software",
    name: "Software",
    icon: Package,
    gradient: "from-sky-300/30 to-blue-500/20",
    component: Software,
    defaultSize: { width: 820, height: 560 },
    dock: true,
    category: "System",
  },
  {
    id: "settings",
    name: "Settings",
    icon: SettingsIcon,
    gradient: "from-slate-400/30 to-blue-600/20",
    component: Settings,
    defaultSize: { width: 720, height: 520 },
    dock: true,
    category: "System",
  },
  {
    id: "bifrost",
    name: "Mission Control",
    icon: LayoutDashboard,
    gradient: "from-cyan-400/30 to-blue-700/20",
    component: Dashboard,
    defaultSize: { width: 900, height: 600 },
    dock: true,
    category: "Nidelvir",
  },
  {
    id: "yggdrasil",
    name: "Realms",
    icon: Server,
    gradient: "from-emerald-400/25 to-cyan-700/20",
    component: Realms,
    defaultSize: { width: 900, height: 600 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "forge",
    name: "The Forge",
    icon: Hammer,
    gradient: "from-amber-400/25 to-blue-700/20",
    component: Modules,
    defaultSize: { width: 900, height: 600 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "mimir",
    name: "Audit Ledger",
    icon: ShieldAlert,
    gradient: "from-rose-400/25 to-blue-700/20",
    component: AuditLog,
    defaultSize: { width: 900, height: 600 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "ymir",
    name: "Kernel Core",
    icon: Binary,
    gradient: "from-indigo-400/25 to-slate-700/30",
    component: Kernel,
    defaultSize: { width: 860, height: 600 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "leviathan",
    name: "Leviathan",
    icon: Waves,
    gradient: "from-cyan-400/30 to-indigo-700/25",
    component: Leviathan,
    defaultSize: { width: 720, height: 620 },
    dock: true,
    category: "Nidelvir",
  },
  {
    id: "huginn",
    name: "Huginn Watch",
    icon: Radar,
    gradient: "from-fuchsia-400/25 to-blue-700/20",
    component: Huginn,
    defaultSize: { width: 900, height: 600 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "heimdallr",
    name: "Heimdallr",
    icon: Fingerprint,
    gradient: "from-amber-300/25 to-cyan-700/20",
    component: Heimdallr,
    defaultSize: { width: 960, height: 620 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "valkyrie",
    name: "Valkyrie",
    icon: Swords,
    gradient: "from-rose-400/25 to-indigo-700/20",
    component: Valkyrie,
    defaultSize: { width: 900, height: 640 },
    dock: false,
    category: "Nidelvir",
  },
  {
    id: "logberg",
    name: "Lögberg",
    icon: Scale,
    gradient: "from-emerald-300/25 to-blue-700/20",
    component: Logberg,
    defaultSize: { width: 900, height: 640 },
    dock: false,
    category: "Nidelvir",
  },
];

export const APP_MAP: Record<string, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a]),
);

export function getApp(id: string): AppDef | undefined {
  return APP_MAP[id];
}
