import React, { useContext } from "react";
import { Link } from "wouter";
import { useInWindow } from "./chrome-context";
import { DesktopContext } from "./DesktopContext";

// Map legacy wouter routes to their windowed-app ids so in-window links
// open the corresponding desktop window instead of a dead route change.
const ROUTE_TO_APP: Record<string, string> = {
  "/": "bifrost",
  "/realms": "yggdrasil",
  "/modules": "forge",
  "/audit": "mimir",
  "/terminal": "terminal",
  "/kernel": "ymir",
  "/huginn": "huginn",
  "/heimdallr": "heimdallr",
  "/valkyrie": "valkyrie",
  "/logberg": "logberg",
};

/**
 * Drop-in replacement for wouter's <Link> inside legacy pages. When the page
 * is rendered inside a desktop window, clicking opens the mapped app; when
 * rendered standalone it falls back to normal routing.
 */
export function PageLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const inWindow = useInWindow();
  const desktop = useContext(DesktopContext);
  const appId = ROUTE_TO_APP[href];

  if (inWindow && desktop && appId) {
    return (
      <button type="button" className={className} onClick={() => desktop.openApp(appId)}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
