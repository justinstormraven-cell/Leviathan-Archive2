import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is in the "mobile" range (touch-first, narrow).
 * On mobile the desktop metaphor collapses: windows go fullscreen, the dock
 * moves to the bottom, and drag/resize are disabled.
 */
export function useIsMobile(breakpoint = 640): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
