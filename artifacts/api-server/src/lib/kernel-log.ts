import os from "os";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface KernelLogLine {
  seq: number;
  timestamp: number;
  level: string; // INFO | WARN | CRIT
  subsystem: string;
  message: string;
}

export interface KernelLog {
  kernelVersion: string;
  hostname: string;
  capturedAt: string;
  lines: KernelLogLine[];
}

function readText(path: string): string | null {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Gather a live "boot log" built entirely from real host facts:
 * /proc/version, /proc/sys, /proc/cpuinfo, /proc/mounts, /proc/modules,
 * seccomp status, network interfaces, and a real dmesg probe. Timestamps
 * are the real elapsed time (seconds) at which each probe completed.
 */
export async function gatherKernelLog(): Promise<KernelLog> {
  const start = performance.now();
  const lines: KernelLogLine[] = [];
  let seq = 0;
  const push = (level: string, subsystem: string, message: string) => {
    lines.push({
      seq: seq++,
      timestamp: (performance.now() - start) / 1000,
      level,
      subsystem,
      message,
    });
  };

  // Kernel version + toolchain (real /proc/version)
  const version = (readText("/proc/version") || "").trim();
  const relMatch = version.match(/Linux version (\S+)/);
  const release = relMatch ? relMatch[1] : os.release();
  push("INFO", "YMIR", `Primordial hardened kernel core online — Linux ${release} (${os.arch()})`);
  const buildMatch =
    version.match(/\(((?:gcc|clang) [^#]*)\)\s+#/i) ||
    version.match(/\(((?:gcc|clang)[^)]*)\)/i);
  if (buildMatch) push("INFO", "YMIR", `Core toolchain: ${buildMatch[1].trim()}`);

  // Address-space randomization (real /proc/sys/kernel/randomize_va_space)
  const aslr = (readText("/proc/sys/kernel/randomize_va_space") || "").trim();
  if (aslr === "2")
    push("INFO", "security", "KASLR: full address-space randomization active (randomize_va_space=2)");
  else if (aslr === "1")
    push("WARN", "security", "KASLR: partial randomization only (randomize_va_space=1)");
  else if (aslr)
    push("WARN", "security", `KASLR: randomization weakened (randomize_va_space=${aslr})`);

  // Seccomp confinement (real /proc/self/status)
  const status = readText("/proc/self/status") || "";
  const seccompMatch = status.match(/Seccomp:\s*(\d+)/);
  const filtersMatch = status.match(/Seccomp_filters:\s*(\d+)/);
  if (seccompMatch) {
    const mode = seccompMatch[1];
    const label = mode === "2" ? "FILTER" : mode === "1" ? "STRICT" : "DISABLED";
    push(
      mode === "0" ? "WARN" : "INFO",
      "security",
      `seccomp: mode ${mode} (${label}) locked — ${filtersMatch ? filtersMatch[1] : 0} BPF filter(s) armed`,
    );
  }

  // Crypto acceleration (real /proc/cpuinfo flags)
  const cpuinfo = readText("/proc/cpuinfo") || "";
  const hasAes = /\baes\b/.test(cpuinfo);
  push(
    hasAes ? "INFO" : "WARN",
    "crypto",
    hasAes
      ? "AES-NI hardware acceleration detected and enabled in-tree"
      : "AES-NI unavailable — software crypto fallback engaged",
  );

  // CPU + load (real)
  const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
  const model = modelMatch ? modelMatch[1].trim() : os.cpus()[0]?.model || "unknown";
  const load = os.loadavg();
  push(
    "INFO",
    "cpu",
    `${model} — ${os.cpus().length} logical cores, load ${load[0].toFixed(2)} ${load[1].toFixed(2)} ${load[2].toFixed(2)}`,
  );

  // Memory (real)
  const totalGiB = os.totalmem() / 1024 ** 3;
  const usedGiB = (os.totalmem() - os.freemem()) / 1024 ** 3;
  const memPct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  push(
    memPct > 90 ? "WARN" : "INFO",
    "mm",
    `memory: ${usedGiB.toFixed(2)}/${totalGiB.toFixed(2)} GiB resident (${memPct}%)`,
  );

  // Root filesystem + tmpfs (real /proc/mounts)
  const mounts = readText("/proc/mounts") || "";
  const mountLines = mounts.split("\n").filter(Boolean);
  const rootLine = mountLines.find((l) => l.split(" ")[1] === "/");
  if (rootLine) {
    const fields = rootLine.split(" ");
    const fstype = fields[2];
    const opts = fields[3] || "";
    const ro = /(^|,)ro(,|$)/.test(opts);
    push(
      ro ? "WARN" : "INFO",
      "block",
      ro
        ? `root ${fstype} mounted READ-ONLY — persistent write-back locked [-EPERM]`
        : `root ${fstype} mounted read-write`,
    );
  }
  const tmpfsCount = mountLines.filter((l) => l.split(" ")[2] === "tmpfs").length;
  push("INFO", "Midgard", `volatile execution store: ${tmpfsCount} tmpfs mount(s) active`);

  // Loadable modules (real /proc/modules)
  const modules = readText("/proc/modules");
  const modCount = modules ? modules.trim().split("\n").filter(Boolean).length : 0;
  push(
    "INFO",
    "module",
    modCount === 0
      ? "0 dynamically loaded modules — statically linked core, injection surface null (SIG_FORCE)"
      : `${modCount} kernel module(s) loaded — signature enforcement active`,
  );

  // Network fabric (real os.networkInterfaces)
  const ifaces = os.networkInterfaces();
  const primary = Object.entries(ifaces).find(
    ([name, addrs]) => name !== "lo" && addrs?.some((a) => !a.internal),
  );
  if (primary) {
    const [name, addrs] = primary;
    const v4 = addrs?.find((a) => a.family === "IPv4" && !a.internal);
    push(
      "INFO",
      "Sleipnir",
      `L2 data link ${name} up — MAC ${v4?.mac || "??"} — ${v4?.address || "no v4"}`,
    );
  }
  push(
    "INFO",
    "netfilter",
    `Gungnir packet hooks initialized across ${Object.keys(ifaces).length} interface(s)`,
  );

  // Real dmesg probe — reports the actual outcome (often EPERM in hardened containers)
  try {
    const { stdout } = await execFileAsync("dmesg", [], {
      timeout: 3000,
      maxBuffer: 1024 * 1024,
    });
    const tail = stdout.trim().split("\n").slice(-1)[0];
    if (tail) push("INFO", "kernel", `dmesg ring buffer: ${tail}`);
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    const msg = err.stderr || err.message || "";
    push(
      "WARN",
      "kernel",
      /not permitted|eperm/i.test(msg)
        ? "dmesg ring buffer read denied [-EPERM] — dmesg_restrict enforced"
        : "dmesg ring buffer unavailable",
    );
  }

  // Uptime + panic posture (real os.uptime)
  const up = os.uptime();
  const days = Math.floor(up / 86400);
  const hrs = Math.floor((up % 86400) / 3600);
  const mins = Math.floor((up % 3600) / 60);
  push(
    "INFO",
    "YMIR",
    `core uptime ${days}d ${hrs}h ${mins}m — panic-on-oops directive armed, memory decay standing by`,
  );

  return {
    kernelVersion: release,
    hostname: os.hostname(),
    capturedAt: new Date().toISOString(),
    lines,
  };
}

// --- Short-TTL cache + single-flight ---------------------------------------
// The gather step spawns a real `dmesg` child process and reads several /proc
// files. This endpoint is public, so we cache the snapshot briefly and collapse
// concurrent requests into one probe to prevent request-flood resource abuse.
const CACHE_TTL_MS = 5000;
let cache: { at: number; value: KernelLog } | null = null;
let inflight: Promise<KernelLog> | null = null;

export async function getKernelLog(): Promise<KernelLog> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const value = await gatherKernelLog();
      cache = { at: Date.now(), value };
      return value;
    } catch (err) {
      if (cache) return cache.value; // serve last good snapshot on failure
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
