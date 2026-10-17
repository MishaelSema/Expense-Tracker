"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Tells Framer Motion to honour the operating system's "reduce motion"
 * preference for every animation in the app.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
