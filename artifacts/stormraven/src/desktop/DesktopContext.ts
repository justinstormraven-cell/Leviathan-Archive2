import { createContext, useContext } from "react";
import type { DesktopApi } from "./types";

export const DesktopContext = createContext<DesktopApi | null>(null);

export function useDesktop(): DesktopApi {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error("useDesktop must be used inside <Desktop>");
  return ctx;
}
