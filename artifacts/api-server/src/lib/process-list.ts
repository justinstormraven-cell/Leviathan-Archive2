import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProcessInfo {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
}

export interface ProcessList {
  capturedAt: string;
  count: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  processes: ProcessInfo[];
}

async function gather(): Promise<ProcessList> {
  const [l1, l5, l15] = os.loadavg();
  let processes: ProcessInfo[] = [];

  try {
    // BusyBox/GNU ps: pid, user, %cpu, %mem, command, sorted by cpu desc.
    const { stdout } = await execFileAsync(
      "ps",
      ["-eo", "pid,user,pcpu,pmem,comm", "--sort=-pcpu"],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    const lines = stdout.trim().split("\n").slice(1); // drop header
    processes = lines
      .map((line) => {
        const m = line.trim().match(/^(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
        if (!m) return null;
        return {
          pid: Number(m[1]),
          user: m[2],
          cpu: Number(m[3]),
          mem: Number(m[4]),
          command: m[5],
        } as ProcessInfo;
      })
      .filter((p): p is ProcessInfo => p !== null)
      .slice(0, 60);
  } catch {
    processes = [];
  }

  return {
    capturedAt: new Date().toISOString(),
    count: processes.length,
    loadAvg1: Number(l1.toFixed(2)),
    loadAvg5: Number(l5.toFixed(2)),
    loadAvg15: Number(l15.toFixed(2)),
    processes,
  };
}

// Short-TTL cache + single-flight to keep repeated polling cheap.
const TTL_MS = 2000;
let cache: { at: number; value: ProcessList } | null = null;
let inflight: Promise<ProcessList> | null = null;

export async function getProcessList(): Promise<ProcessList> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const value = await gather();
      cache = { at: Date.now(), value };
      return value;
    } catch (err) {
      if (cache) return cache.value;
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
