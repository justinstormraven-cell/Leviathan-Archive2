// Shared desktop appearance store (accent + wallpaper), persisted to
// localStorage and applied to the document root / desktop background.

export interface Accent {
  id: string;
  name: string;
  primary: string; // hsl triples matching index.css --primary
  ring: string;
}

export const ACCENTS: Accent[] = [
  { id: "ice", name: "Glacier Ice", primary: "196 94% 56%", ring: "196 94% 60%" },
  { id: "azure", name: "Azure", primary: "211 92% 62%", ring: "211 92% 66%" },
  { id: "cyan", name: "Cyan", primary: "186 90% 50%", ring: "186 90% 54%" },
  { id: "frost", name: "Frost", primary: "201 82% 68%", ring: "201 82% 72%" },
  { id: "aqua", name: "Aqua", primary: "170 78% 48%", ring: "170 78% 52%" },
];

const ACCENT_KEY = "sr_accent";

export function savedAccentId(): string {
  return localStorage.getItem(ACCENT_KEY) || "ice";
}

export function applyAccent(id: string): void {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--ring", a.ring);
  localStorage.setItem(ACCENT_KEY, a.id);
}

export interface Wallpaper {
  id: string;
  name: string;
  css: string;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "glacier",
    name: "Glacier",
    css: "radial-gradient(ellipse 90% 70% at 20% -10%, hsla(196,90%,30%,0.35), transparent 60%), radial-gradient(ellipse 80% 60% at 90% 110%, hsla(211,90%,35%,0.28), transparent 60%), linear-gradient(160deg, #05090f 0%, #030507 60%, #02040a 100%)",
  },
  {
    id: "abyss",
    name: "Abyss",
    css: "radial-gradient(circle at 50% 120%, hsla(196,90%,28%,0.4), transparent 55%), linear-gradient(180deg, #01030a 0%, #000 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    css: "radial-gradient(ellipse 60% 50% at 15% 20%, hsla(170,80%,35%,0.28), transparent 55%), radial-gradient(ellipse 70% 60% at 85% 30%, hsla(211,90%,40%,0.3), transparent 55%), linear-gradient(160deg, #04070d, #02040a)",
  },
  {
    id: "carbon",
    name: "Carbon",
    css: "radial-gradient(ellipse 100% 60% at 50% 0%, hsla(205,40%,16%,0.6), transparent 60%), linear-gradient(180deg, #060a10, #010204)",
  },
];

const WALL_KEY = "sr_wallpaper";
export const WALLPAPER_EVENT = "sr-wallpaper";

export function savedWallpaperId(): string {
  return localStorage.getItem(WALL_KEY) || "glacier";
}

export function setWallpaper(id: string): void {
  localStorage.setItem(WALL_KEY, id);
  window.dispatchEvent(new CustomEvent(WALLPAPER_EVENT, { detail: id }));
}

export function wallpaperCss(id: string): string {
  return (WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]).css;
}
