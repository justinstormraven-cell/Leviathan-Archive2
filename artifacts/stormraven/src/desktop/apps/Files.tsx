import React, { useState } from "react";
import {
  useGetFsList,
  getGetFsListQueryKey,
} from "@workspace/api-client-react";
import {
  Folder,
  FileText,
  ArrowUp,
  Home,
  HardDrive,
  RefreshCw,
  FolderTree,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../auth";
import { useDesktop } from "../DesktopContext";
import type { WinInstance } from "../types";
import LoginGate from "./LoginGate";

const QUICK = [
  { label: "Home", icon: Home, path: "~" },
  { label: "Workspace", icon: FolderTree, path: "/home/runner/workspace" },
  { label: "Temp", icon: Folder, path: "/tmp" },
  { label: "Filesystem", icon: HardDrive, path: "/" },
];

function fmtSize(n: number | null): string {
  if (n == null) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export default function Files({ win }: { win?: WinInstance }) {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Files" subtitle="Authenticate to browse the filesystem" />;
  return <FilesInner initial={(win?.payload?.path as string) || undefined} />;
}

function FilesInner({ initial }: { initial?: string }) {
  const [path, setPath] = useState<string | undefined>(initial);
  const [draft, setDraft] = useState(initial ?? "");
  const { openApp } = useDesktop();

  const params = path ? { path } : undefined;
  const { data, isLoading, isFetching, error, refetch } = useGetFsList(params, {
    query: { queryKey: getGetFsListQueryKey(params) },
  });

  const go = (p: string) => {
    setPath(p);
    setDraft(p);
  };

  const currentPath = data?.path ?? path ?? "~";

  return (
    <div className="h-full flex flex-col font-sans text-sm">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 glass">
        <button
          onClick={() => data?.parent && go(data.parent)}
          disabled={!data?.parent}
          className="p-1.5 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
          title="Up"
          data-testid="button-up"
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(draft.trim() || "~")}
          placeholder="~"
          className="flex-1 rounded-md bg-input/50 border border-border px-2.5 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary"
          spellCheck={false}
          data-testid="input-path"
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* sidebar */}
        <aside className="w-40 shrink-0 border-r border-border py-2 hidden sm:block">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            Places
          </p>
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.path}
                onClick={() => go(q.path)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-secondary text-foreground/90"
                data-testid={`link-place-${q.label.toLowerCase()}`}
              >
                <Icon size={15} className="text-primary" />
                <span className="truncate">{q.label}</span>
              </button>
            );
          })}
        </aside>

        {/* listing */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <p className="p-4 text-muted-foreground animate-pulse">Reading directory…</p>
          )}
          {error && (
            <div className="p-4 text-destructive flex items-center gap-2">
              <AlertTriangle size={16} />
              {(error as Error).message}
            </div>
          )}
          {data && (
            <table className="w-full">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0 glass-strong">
                <tr>
                  <th className="text-left font-medium px-3 py-1.5">Name</th>
                  <th className="text-right font-medium px-3 py-1.5 w-24">Size</th>
                  <th className="text-left font-medium px-3 py-1.5 w-44 hidden md:table-cell">
                    Modified
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      Empty directory
                    </td>
                  </tr>
                )}
                {data.entries.map((e) => {
                  const isDir = e.type === "directory";
                  return (
                    <tr
                      key={e.path}
                      onDoubleClick={() =>
                        isDir ? go(e.path) : openApp("editor", { path: e.path })
                      }
                      className="hover:bg-primary/10 cursor-pointer border-b border-border/40"
                      data-testid={`row-entry-${e.name}`}
                    >
                      <td className="px-3 py-1.5 flex items-center gap-2 min-w-0">
                        {isDir ? (
                          <Folder size={16} className="text-primary shrink-0" />
                        ) : (
                          <FileText size={16} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{e.name}</span>
                        {e.type === "symlink" && (
                          <span className="text-[10px] text-accent">↗</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground font-mono text-xs">
                        {isDir ? "—" : fmtSize(e.size)}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs hidden md:table-cell">
                        {e.modified ? new Date(e.modified).toLocaleString() : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-border text-[11px] text-muted-foreground shrink-0 font-mono truncate">
        {currentPath} · {data?.entries.length ?? 0} items
      </div>
    </div>
  );
}
