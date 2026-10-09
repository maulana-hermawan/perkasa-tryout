import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TryoutKu is a client-rendered application: all data lives in a mock
  // backend (Zustand + localStorage) behind the repository layer, so there is
  // no server data to cache. Cache Components / Partial Prefetching are
  // therefore turned off until a real backend (Supabase/Firebase) is plugged
  // into `src/lib/repositories`.
  cacheComponents: false,
  partialPrefetching: false,
  // Dev-only: let the sandbox preview host talk to `next dev`.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "*.arena.ai:443"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
