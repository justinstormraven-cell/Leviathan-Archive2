import { createContext, useContext } from "react";

/**
 * True when a legacy page (built around <Layout>) is being rendered inside a
 * desktop window. Layout reads this to drop its full-screen chrome (header +
 * sidebar) and render as plain window content instead.
 */
export const InWindowContext = createContext(false);
export const useInWindow = () => useContext(InWindowContext);
