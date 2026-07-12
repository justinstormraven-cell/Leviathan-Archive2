import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface PackageInfo {
  id: string;
  name: string;
  summary: string;
  category: string;
  bin: string;
  icon: string;
  installed: boolean;
}

export interface PackageList {
  capturedAt: string;
  categories: string[];
  packages: PackageInfo[];
}

// Curated Ubuntu-flavoured catalog. `bin` is the executable we probe to decide
// whether the package is really available on the host, so "installed" reflects
// reality rather than a hardcoded flag.
const CATALOG: Omit<PackageInfo, "installed">[] = [
  { id: "firefox", name: "Firefox", summary: "Fast, private web browser", category: "Internet", bin: "firefox", icon: "globe" },
  { id: "chromium", name: "Chromium", summary: "Open-source web browser", category: "Internet", bin: "chromium", icon: "globe" },
  { id: "curl", name: "cURL", summary: "Transfer data with URLs", category: "Internet", bin: "curl", icon: "download" },
  { id: "wget", name: "Wget", summary: "Network downloader", category: "Internet", bin: "wget", icon: "download" },
  { id: "openssh", name: "OpenSSH", summary: "Secure shell client", category: "Internet", bin: "ssh", icon: "key-round" },

  { id: "gimp", name: "GIMP", summary: "GNU Image Manipulation Program", category: "Graphics", bin: "gimp", icon: "image" },
  { id: "blender", name: "Blender", summary: "3D creation suite", category: "Graphics", bin: "blender", icon: "box" },
  { id: "imagemagick", name: "ImageMagick", summary: "Image conversion & editing toolkit", category: "Graphics", bin: "magick", icon: "image" },
  { id: "ffmpeg", name: "FFmpeg", summary: "Audio & video swiss-army knife", category: "Graphics", bin: "ffmpeg", icon: "clapperboard" },

  { id: "libreoffice", name: "LibreOffice", summary: "Office productivity suite", category: "Office", bin: "libreoffice", icon: "file-text" },
  { id: "vim", name: "Vim", summary: "Ubiquitous modal text editor", category: "Office", bin: "vim", icon: "file-code-2" },
  { id: "nano", name: "GNU nano", summary: "Simple console text editor", category: "Office", bin: "nano", icon: "pencil" },

  { id: "nodejs", name: "Node.js", summary: "JavaScript runtime", category: "Development", bin: "node", icon: "hexagon" },
  { id: "python3", name: "Python 3", summary: "Python interpreter", category: "Development", bin: "python3", icon: "terminal-square" },
  { id: "git", name: "Git", summary: "Distributed version control", category: "Development", bin: "git", icon: "git-branch" },
  { id: "gcc", name: "GCC", summary: "GNU Compiler Collection", category: "Development", bin: "gcc", icon: "cpu" },
  { id: "make", name: "GNU Make", summary: "Build automation tool", category: "Development", bin: "make", icon: "hammer" },
  { id: "go", name: "Go", summary: "The Go programming language", category: "Development", bin: "go", icon: "code-2" },
  { id: "rust", name: "Rust", summary: "Systems programming language", category: "Development", bin: "cargo", icon: "cog" },
  { id: "docker", name: "Docker", summary: "Container runtime", category: "Development", bin: "docker", icon: "container" },

  { id: "htop", name: "htop", summary: "Interactive process viewer", category: "Utilities", bin: "htop", icon: "activity" },
  { id: "tmux", name: "tmux", summary: "Terminal multiplexer", category: "Utilities", bin: "tmux", icon: "layout-grid" },
  { id: "ripgrep", name: "ripgrep", summary: "Blazing-fast recursive search", category: "Utilities", bin: "rg", icon: "search" },
  { id: "jq", name: "jq", summary: "Command-line JSON processor", category: "Utilities", bin: "jq", icon: "braces" },
  { id: "zip", name: "Zip", summary: "Archive compression utility", category: "Utilities", bin: "zip", icon: "archive" },

  { id: "postgresql", name: "PostgreSQL", summary: "Relational database client", category: "System", bin: "psql", icon: "database" },
  { id: "redis", name: "Redis", summary: "In-memory data store client", category: "System", bin: "redis-cli", icon: "database" },
  { id: "nginx", name: "NGINX", summary: "High-performance web server", category: "System", bin: "nginx", icon: "server" },
];

async function detectInstalled(bins: string[]): Promise<Set<string>> {
  try {
    const script = bins.map((b) => `command -v ${b} >/dev/null 2>&1 && echo ${b}`).join("; ");
    const { stdout } = await execFileAsync("bash", ["-lc", script], {
      maxBuffer: 1024 * 1024,
      timeout: 8000,
    });
    return new Set(stdout.trim().split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

async function gather(): Promise<PackageList> {
  const present = await detectInstalled(CATALOG.map((c) => c.bin));
  const packages = CATALOG.map((c) => ({ ...c, installed: present.has(c.bin) }));
  const categories = Array.from(new Set(CATALOG.map((c) => c.category)));
  return { capturedAt: new Date().toISOString(), categories, packages };
}

// Cache for a minute — binary availability barely changes.
const TTL_MS = 60_000;
let cache: { at: number; value: PackageList } | null = null;
let inflight: Promise<PackageList> | null = null;

export async function getPackageList(): Promise<PackageList> {
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
