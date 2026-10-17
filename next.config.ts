import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ledger is auth-gated: every app route reads the session (cookies) at render.
  // Cache Components would require wrapping each dynamic read in <Suspense>,
  // so it stays off. Revisit if the app gains static/marketing routes worth caching.
  cacheComponents: false,
  // Anchor Turbopack to this project — a lockfile one level up otherwise makes
  // Next infer the wrong workspace root.
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
