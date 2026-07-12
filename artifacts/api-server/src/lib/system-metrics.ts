import os from "os";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Real CPU utilisation sampled over a short interval. */
export async function getCpuPercent(): Promise<number> {
  const sample = () => {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const t of Object.values(cpu.times)) total += t;
      idle += cpu.times.idle;
    }
    return { idle, total };
  };
  const a = sample();
  await new Promise((r) => setTimeout(r, 150));
  const b = sample();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  if (totalDelta <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

/** Total number of running processes on the host. */
export function getProcessCount(): number {
  try {
    return fs.readdirSync("/proc").filter((e) => /^\d+$/.test(e)).length;
  } catch {
    return 0;
  }
}

/** Real disk usage percentage for the filesystem containing `path`. */
export async function getDiskUsagePercent(targetPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("df", ["-P", targetPath]);
    const lines = stdout.trim().split("\n");
    const parts = lines[lines.length - 1].split(/\s+/);
    const capacity = parts[4];
    const pct = parseFloat(String(capacity).replace("%", ""));
    return Number.isNaN(pct) ? null : pct;
  } catch {
    return null;
  }
}

/** Count of live processes whose current working directory is under `basePath`. */
export function getProcessesUnderPath(basePath: string): number {
  let resolvedBase: string;
  try {
    resolvedBase = fs.realpathSync(basePath);
  } catch {
    return 0;
  }
  let pids: string[];
  try {
    pids = fs.readdirSync("/proc").filter((e) => /^\d+$/.test(e));
  } catch {
    return 0;
  }
  const prefix = resolvedBase === "/" ? "/" : resolvedBase + "/";
  let count = 0;
  for (const pid of pids) {
    try {
      const cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
      if (cwd === resolvedBase || cwd.startsWith(prefix)) count++;
    } catch {
      // process gone or cwd not readable — skip
    }
  }
  return count;
}
