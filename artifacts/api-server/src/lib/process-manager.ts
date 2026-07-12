import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const LOG_DIR = "/tmp/stormraven";

function ensureLogDir(): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Raw liveness — does *a* process with this PID exist right now. */
function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Identity check: is the process at `pid` actually one of OUR module
 * processes for `codename`? Guards against PID reuse — every module process
 * is spawned with STORMRAVEN_MODULE=<codename> in its environment.
 */
function identityMatches(pid: number, codename: string): boolean {
  try {
    const environ = fs.readFileSync(`/proc/${pid}/environ`, "utf8");
    return environ.split("\0").includes(`STORMRAVEN_MODULE=${codename}`);
  } catch {
    return false;
  }
}

/**
 * Whether the module's tracked PID is a live, identity-verified process.
 * When `codename` is provided, PID reuse cannot produce a false positive.
 */
export function isAlive(
  pid: number | null | undefined,
  codename?: string,
): boolean {
  if (!pid || pid <= 0) return false;
  if (!pidExists(pid)) return false;
  if (codename && !identityMatches(pid, codename)) return false;
  return true;
}

/**
 * Spawn a real detached background process for a module.
 * Runs in its realm's directory so it is attributed to that realm's
 * live process count. Returns the real PID.
 */
export function startModuleProcess(
  codename: string,
  command: string,
  cwd: string,
): number {
  ensureLogDir();
  const logFile = path.join(LOG_DIR, `${codename.toLowerCase()}.log`);
  const workingDir = fs.existsSync(cwd) ? cwd : process.cwd();
  const out = fs.openSync(logFile, "a");
  const child = spawn("bash", ["-c", command], {
    cwd: workingDir,
    detached: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, STORMRAVEN_MODULE: codename },
  });
  child.unref();
  return child.pid ?? -1;
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    // Detached children lead their own process group (pgid === pid),
    // so a negative pid signals the whole group (bash + its children).
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // already gone
    }
  }
}

/**
 * Terminate a module's process group: identity-verified SIGTERM, wait for
 * exit, then escalate to SIGKILL so stubborn processes cannot be orphaned.
 */
export async function stopModuleProcess(
  pid: number | null | undefined,
  codename: string,
): Promise<void> {
  // Only act if this PID is genuinely our module process (never kill a
  // recycled PID belonging to something else).
  if (!isAlive(pid, codename)) return;
  const target = pid as number;

  signalGroup(target, "SIGTERM");
  for (let i = 0; i < 15; i++) {
    await sleep(100);
    if (!pidExists(target)) return;
  }
  // Still alive after ~1.5s of grace — force kill.
  signalGroup(target, "SIGKILL");
}
