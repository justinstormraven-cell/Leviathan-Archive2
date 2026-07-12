import React, { useMemo, useState } from "react";
import { useGetPackages, getGetPackagesQueryKey } from "@workspace/api-client-react";
import {
  Globe,
  Download,
  KeyRound,
  Image as ImageIcon,
  Box,
  Clapperboard,
  FileText,
  FileCode2,
  Pencil,
  Hexagon,
  TerminalSquare,
  GitBranch,
  Cpu,
  Hammer,
  Code2,
  Cog,
  Container,
  Activity,
  LayoutGrid,
  Search,
  Braces,
  Archive,
  Database,
  Server,
  Package,
  Check,
} from "lucide-react";
import { useDesktop } from "../DesktopContext";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconType> = {
  globe: Globe,
  download: Download,
  "key-round": KeyRound,
  image: ImageIcon,
  box: Box,
  clapperboard: Clapperboard,
  "file-text": FileText,
  "file-code-2": FileCode2,
  pencil: Pencil,
  hexagon: Hexagon,
  "terminal-square": TerminalSquare,
  "git-branch": GitBranch,
  cpu: Cpu,
  hammer: Hammer,
  "code-2": Code2,
  cog: Cog,
  container: Container,
  activity: Activity,
  "layout-grid": LayoutGrid,
  search: Search,
  braces: Braces,
  archive: Archive,
  database: Database,
  server: Server,
};

export default function Software() {
  const { data } = useGetPackages({
    query: { queryKey: getGetPackagesQueryKey() },
  });
  const { openApp } = useDesktop();
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = data?.packages ?? [];
    return list.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (q === "" ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.summary.toLowerCase().includes(q.toLowerCase())),
    );
  }, [data, cat, q]);

  const cats = ["All", ...(data?.categories ?? [])];
  const installedCount = (data?.packages ?? []).filter((p) => p.installed).length;

  return (
    <div className="h-full flex flex-col font-sans text-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 glass">
        <Package size={16} className="text-primary" />
        <span className="font-medium">Software</span>
        <span className="text-xs text-muted-foreground">
          {installedCount} installed · {data?.packages.length ?? 0} in catalog
        </span>
        <div className="flex-1" />
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="rounded-md bg-input/50 border border-border pl-7 pr-2 py-1.5 text-xs text-foreground outline-none focus:border-primary w-40"
            data-testid="input-search-pkg"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-36 shrink-0 border-r border-border py-2 overflow-auto hidden sm:block">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`w-full text-left px-3 py-1.5 text-xs ${
                cat === c
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary border-l-2 border-transparent"
              }`}
              data-testid={`cat-${c}`}
            >
              {c}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.map((p) => {
              const Icon = ICONS[p.icon] ?? Package;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3 hover:border-primary/40 transition-colors"
                  data-testid={`pkg-${p.id}`}
                >
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/25 to-accent/20 grid place-items-center shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.summary}</p>
                  </div>
                  {p.installed ? (
                    <span className="flex items-center gap-1 text-xs text-success shrink-0">
                      <Check size={14} /> Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => openApp("terminal")}
                      className="text-xs px-2.5 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                      title="Install via the terminal"
                      data-testid={`button-get-${p.id}`}
                    >
                      Get
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No packages match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
