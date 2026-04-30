import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to the monorepo root so it doesn't latch onto
  // an unrelated lockfile in $HOME.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
