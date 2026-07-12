import React, { useEffect, useState } from "react";
import {
  useGetFsRead,
  getGetFsReadQueryKey,
  useWriteFsFile,
} from "@workspace/api-client-react";
import { Save, FolderOpen, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "../auth";
import type { WinInstance } from "../types";
import LoginGate from "./LoginGate";

export default function TextEditor({ win }: { win?: WinInstance }) {
  const { token } = useAuth();
  if (!token)
    return <LoginGate title="Text Editor" subtitle="Authenticate to edit files" />;
  return <EditorInner initialPath={(win?.payload?.path as string) || ""} />;
}

function EditorInner({ initialPath }: { initialPath: string }) {
  const [draft, setDraft] = useState(initialPath);
  const [openPath, setOpenPath] = useState(initialPath);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, error } = useGetFsRead(
    { path: openPath },
    { query: { queryKey: getGetFsReadQueryKey({ path: openPath }), enabled: !!openPath } },
  );

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setDirty(false);
    }
  }, [data]);

  const write = useWriteFsFile({
    mutation: {
      onSuccess: () => {
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    },
  });

  const open = () => {
    const p = draft.trim();
    if (p) setOpenPath(p);
  };

  const save = () => {
    if (!openPath) return;
    write.mutate({ data: { path: openPath, content } });
  };

  return (
    <div className="h-full flex flex-col font-sans text-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 glass">
        <FolderOpen size={16} className="text-primary shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && open()}
          placeholder="/path/to/file"
          className="flex-1 rounded-md bg-input/50 border border-border px-2.5 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary"
          spellCheck={false}
          data-testid="input-editor-path"
        />
        <button
          onClick={open}
          className="px-2.5 py-1.5 rounded-md text-xs bg-secondary hover:bg-secondary/70 text-foreground"
          data-testid="button-open"
        >
          Open
        </button>
        <button
          onClick={save}
          disabled={!openPath || write.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-primary/90 hover:bg-primary text-primary-foreground disabled:opacity-40"
          data-testid="button-save"
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {write.isPending ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {data?.truncated && (
        <div className="px-3 py-1.5 bg-warning/10 text-warning text-xs flex items-center gap-2 border-b border-warning/20">
          <AlertTriangle size={13} /> File exceeds 512 KB — showing a truncated view.
          Saving will overwrite with only the visible content.
        </div>
      )}
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 text-destructive text-xs flex items-center gap-2 border-b border-destructive/20">
          <AlertTriangle size={13} /> {(error as Error).message}
        </div>
      )}

      {!openPath ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Enter a file path above and press Open.
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse">
          Loading…
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
          className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-foreground outline-none"
          data-testid="textarea-content"
        />
      )}

      <div className="px-3 py-1 border-t border-border text-[11px] text-muted-foreground shrink-0 font-mono flex justify-between">
        <span className="truncate">{openPath || "no file"}</span>
        <span>{dirty ? "● modified" : "saved"}</span>
      </div>
    </div>
  );
}
