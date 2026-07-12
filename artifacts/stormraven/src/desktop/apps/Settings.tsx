import React, { useState } from "react";
import {
  useGetKernelLog,
  getGetKernelLogQueryKey,
  useGetSystemMetrics,
  getGetSystemMetricsQueryKey,
} from "@workspace/api-client-react";
import {
  Info,
  Palette,
  User,
  Power,
  Check,
  LogOut,
  RotateCw,
  Lock,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  ACCENTS,
  WALLPAPERS,
  applyAccent,
  savedAccentId,
  savedWallpaperId,
  setWallpaper,
  wallpaperCss,
} from "../theme";

type Section = "about" | "appearance" | "users" | "power";

const NAV: { id: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "about", label: "About", icon: Info },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "users", label: "Users", icon: User },
  { id: "power", label: "Power", icon: Power },
];

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

export default function Settings() {
  const [section, setSection] = useState<Section>("about");
  return (
    <div className="h-full flex font-sans text-sm">
      <aside className="w-40 shrink-0 border-r border-border py-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                section === n.id
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary border-l-2 border-transparent"
              }`}
              data-testid={`settings-nav-${n.id}`}
            >
              <Icon size={15} />
              {n.label}
            </button>
          );
        })}
      </aside>
      <div className="flex-1 overflow-auto p-5">
        {section === "about" && <About />}
        {section === "appearance" && <Appearance />}
        {section === "users" && <Users />}
        {section === "power" && <PowerPanel />}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground font-mono text-xs text-right truncate">{v}</span>
    </div>
  );
}

function About() {
  const { data: kernel } = useGetKernelLog({
    query: { queryKey: getGetKernelLogQueryKey() },
  });
  const { data: m } = useGetSystemMetrics({
    query: { queryKey: getGetSystemMetricsQueryKey() },
  });
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={`${import.meta.env.BASE_URL}nidelvir-mark.png`}
          alt=""
          className="w-16 h-16 rounded-full border border-primary/40 forge-glow"
        />
        <div>
          <h2 className="text-xl font-medium text-foreground">StormRaven OS</h2>
          <p className="text-sm text-muted-foreground">26.04 LTS · “Glacier”</p>
        </div>
      </div>
      <Row k="Base" v="Nidelvir Core (Debian-compatible)" />
      <Row k="Kernel" v={kernel?.kernelVersion ?? "…"} />
      <Row k="Hostname" v={kernel?.hostname ?? "…"} />
      <Row k="Memory" v={m ? `${m.memoryPercent.toFixed(0)}% used` : "…"} />
      <Row k="CPU load" v={m ? `${m.cpuPercent.toFixed(0)}%` : "…"} />
      <Row k="Uptime" v={m ? fmtUptime(m.uptimeSeconds) : "…"} />
      <Row k="Clearance" v={m?.authLevel ?? "…"} />
      <Row k="Windowing" v="StormRaven Shell (GNOME-class)" />
    </div>
  );
}

function Appearance() {
  const [accent, setAccent] = useState(savedAccentId());
  const [wall, setWall] = useState(savedWallpaperId());
  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h3 className="text-foreground font-medium mb-3">Accent colour</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                applyAccent(a.id);
                setAccent(a.id);
              }}
              className="flex flex-col items-center gap-1.5"
              data-testid={`accent-${a.id}`}
            >
              <span
                className="w-10 h-10 rounded-full border-2 grid place-items-center"
                style={{
                  background: `hsl(${a.primary})`,
                  borderColor: accent === a.id ? "#fff" : "transparent",
                }}
              >
                {accent === a.id && <Check size={16} className="text-black" />}
              </span>
              <span className="text-[11px] text-muted-foreground">{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-foreground font-medium mb-3">Wallpaper</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setWallpaper(w.id);
                setWall(w.id);
              }}
              className={`aspect-video rounded-lg border-2 overflow-hidden ${
                wall === w.id ? "border-primary" : "border-border"
              }`}
              style={{ background: wallpaperCss(w.id), backgroundSize: "cover" }}
              data-testid={`wall-${w.id}`}
            >
              <span className="block text-[11px] text-white/80 mt-auto p-1 text-left">
                {w.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Users() {
  const { operator, logout, token } = useAuth();
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 grid place-items-center">
          <User size={28} className="text-primary-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            {operator ?? "Guest operator"}
          </p>
          <p className="text-sm text-muted-foreground">
            {token ? "Authenticated" : "Not signed in"}
          </p>
        </div>
      </div>
      <Row k="Account type" v="Administrator" />
      <Row k="Shell" v="/bin/bash" />
      <Row k="Session" v={token ? "Active" : "Locked"} />
      {token && (
        <button
          onClick={logout}
          className="mt-6 flex items-center gap-2 px-3 py-2 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm"
          data-testid="button-signout"
        >
          <LogOut size={15} /> Sign out
        </button>
      )}
    </div>
  );
}

function PowerPanel() {
  const { logout } = useAuth();
  return (
    <div className="max-w-md space-y-3">
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary text-left"
        data-testid="button-lock"
      >
        <Lock size={18} className="text-primary" />
        <span>
          <span className="block text-foreground">Lock session</span>
          <span className="block text-xs text-muted-foreground">
            Clear the operator seal and require re-authentication
          </span>
        </span>
      </button>
      <button
        onClick={() => window.location.reload()}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary text-left"
        data-testid="button-restart"
      >
        <RotateCw size={18} className="text-primary" />
        <span>
          <span className="block text-foreground">Restart shell</span>
          <span className="block text-xs text-muted-foreground">
            Reload the StormRaven desktop session
          </span>
        </span>
      </button>
    </div>
  );
}
