import fs from "fs";
import fsp from "fs/promises";
import path from "path";

/**
 * Sandbox root. All filesystem access through this module is confined to this
 * directory tree. Requests that resolve (or symlink) outside of it are refused.
 */
export const FS_ROOT = path.resolve(process.env.FS_ROOT || "/home/runner/workspace");
export const FS_HOME = FS_ROOT;
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

/** True when `target` is FS_ROOT itself or a descendant of it. */
function isWithinRoot(target: string): boolean {
  const rel = path.relative(FS_ROOT, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function outsideRootError(): Error {
  return Object.assign(new Error("Path is outside the permitted workspace root"), {
    code: "EACCES",
  });
}

function assertWithinRoot(target: string): string {
  if (!isWithinRoot(target)) throw outsideRootError();
  return target;
}

/**
 * Resolve an incoming path request to an absolute, normalised path, confined to
 * the sandbox root. Relative paths resolve against FS_ROOT; absolute paths that
 * escape the root are rejected. This is a lexical check only — callers that
 * touch the filesystem must additionally use {@link realpathWithinRoot} to
 * defeat symlink-based escapes.
 */
export function resolvePath(input: string | undefined): string {
  const raw = expandHome((input ?? FS_HOME).trim() || FS_HOME);
  const resolved = path.resolve(FS_ROOT, raw);
  return assertWithinRoot(resolved);
}

/**
 * Resolve a path's real (symlink-followed) location and assert it stays inside
 * the sandbox root. When `mustExist` is false the final path component may be
 * missing (for creating new files); its parent directory is still resolved and
 * bounds-checked so a symlinked parent cannot escape the root.
 */
async function realpathWithinRoot(target: string, mustExist: boolean): Promise<string> {
  try {
    return assertWithinRoot(await fsp.realpath(target));
  } catch (err) {
    if (!mustExist && (err as { code?: string }).code === "ENOENT") {
      const parent = await fsp.realpath(path.dirname(target));
      return assertWithinRoot(path.join(assertWithinRoot(parent), path.basename(target)));
    }
    throw err;
  }
}

export async function listDirectory(input: string | undefined): Promise<FsListing> {
  const dir = await realpathWithinRoot(resolvePath(input), true);
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
      // lstat: describe the entry itself, never follow a symlink out of root.
      const st = await fsp.lstat(full);
      if (st.isDirectory()) type = "directory";
      else if (st.isFile()) type = "file";
      else if (st.isSymbolicLink()) type = "symlink";
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

  // Never expose a parent above the sandbox root.
  const parent = isWithinRoot(path.dirname(dir)) && dir !== FS_ROOT ? path.dirname(dir) : null;
  return { path: dir, parent, entries };
}

export async function readFile(input: string): Promise<FsFile> {
  const target = await realpathWithinRoot(resolvePath(input), true);
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
  const target = await realpathWithinRoot(resolvePath(input), false);
  // Refuse to clobber a directory.
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    throw Object.assign(new Error("Target is a directory"), { code: "EISDIR" });
  }
  await fsp.writeFile(target, content, "utf8");
  return { path: target, bytes: Buffer.byteLength(content, "utf8") };
}

export const FS_QUICK_LINKS: { label: string; path: string }[] = [
  { label: "Workspace", path: FS_ROOT },
];
