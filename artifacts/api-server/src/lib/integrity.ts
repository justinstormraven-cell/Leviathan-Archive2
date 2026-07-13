import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// Heimdallr file-integrity monitoring.
// Watched paths are resolved relative to the repository root. These are the
// security-critical files whose tampering would indicate a compromise.
const ROOT = process.env.REPL_HOME || process.cwd();

export const WATCHED_PATHS: string[] = [
  "artifacts/api-server/src/lib/auth.ts",
  "artifacts/api-server/src/routes/terminal.ts",
  "artifacts/api-server/src/routes/fs.ts",
  "artifacts/api-server/package.json",
  "lib/db/src/schema/auth.ts",
];

export interface FileFingerprint {
  hash: string | null; // null when the file is missing / unreadable
  sizeBytes: number;
}

/** Compute the SHA-256 fingerprint of a watched path. */
export async function fingerprint(relPath: string): Promise<FileFingerprint> {
  const abs = path.resolve(ROOT, relPath);
  try {
    const buf = await fs.readFile(abs);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    return { hash, sizeBytes: buf.length };
  } catch {
    return { hash: null, sizeBytes: 0 };
  }
}
