import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";

export const FS_HOME = process.env.HOME || "/home/runner/workspace";
const MAX_READ_BYTES = 512 * 1024; // 512 KB read cap for the editor/viewer

export interface FsEntry {
  name: string;
  path: string;
  type: "directory" | "file" | "symlink" | "other";
  size: number | null;
  modified: string | null;
}

export interface FsListing {
  path: string;
  parent: string | null;
  entries: FsEntry[];
}

export interface FsFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
}

function expandHome(target: string): string {
  if (!target || target === "~") return FS_HOME;
  if (target.startsWith("~/")) return path.join(FS_HOME, target.slice(2));
  return target;
}

/** Resolve an incoming path request to an absolute, normalised path. */
export function resolvePath(input: string | undefined): string {
  const raw = expandHome((input ?? FS_HOME).trim() || FS_HOME);
  return path.resolve(raw);
}

export async function listDirectory(input: string | undefined): Promise<FsListing> {
  const dir = resolvePath(input);
  const dirents = await fsp.readdir(dir, { withFileTypes: true });

  const entries: FsEntry[] = [];
  for (const d of dirents) {
    const full = path.join(dir, d.name);
    let type: FsEntry["type"] = "other";
    if (d.isDirectory()) type = "directory";
    else if (d.isFile()) type = "file";
    else if (d.isSymbolicLink()) type = "symlink";

    let size: number | null = null;
    let modified: string | null = null;
    try {
      const st = await fsp.stat(full);
      if (st.isDirectory()) type = "directory";
      else if (st.isFile()) type = "file";
      size = st.isFile() ? st.size : null;
      modified = st.mtime.toISOString();
    } catch {
      // broken symlink or permission denied — keep partial info
    }

    entries.push({ name: d.name, path: full, type, size, modified });
  }

  // Directories first, then alphabetical (case-insensitive).
  entries.sort((a, b) => {
    if (a.type === "directory" && b.type !== "directory") return -1;
    if (a.type !== "directory" && b.type === "directory") return 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  const parent = dir === "/" ? null : path.dirname(dir);
  return { path: dir, parent, entries };
}

export async function readFile(input: string): Promise<FsFile> {
  const target = resolvePath(input);
  const st = await fsp.stat(target);
  if (!st.isFile()) {
    throw Object.assign(new Error("Not a regular file"), { code: "ENOTFILE" });
  }
  const truncated = st.size > MAX_READ_BYTES;
  const fd = await fsp.open(target, "r");
  try {
    const length = truncated ? MAX_READ_BYTES : st.size;
    const buf = Buffer.alloc(length);
    await fd.read(buf, 0, length, 0);
    return { path: target, content: buf.toString("utf8"), size: st.size, truncated };
  } finally {
    await fd.close();
  }
}

export async function writeFile(
  input: string,
  content: string,
): Promise<{ path: string; bytes: number }> {
  const target = resolvePath(input);
  // Refuse to clobber a directory.
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    throw Object.assign(new Error("Target is a directory"), { code: "EISDIR" });
  }
  await fsp.writeFile(target, content, "utf8");
  return { path: target, bytes: Buffer.byteLength(content, "utf8") };
}

export const FS_QUICK_LINKS: { label: string; path: string }[] = [
  { label: "Home", path: FS_HOME },
  { label: "Workspace", path: "/home/runner/workspace" },
  { label: "tmp", path: os.tmpdir() },
  { label: "Root", path: "/" },
];
