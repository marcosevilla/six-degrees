import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  // The solver routes read these at runtime with fs, so make sure they ship.
  outputFileTracingIncludes: {
    "/api/puzzle": ["./data/costar-graph.json", "./data/actor-pool.json"],
    "/api/route": ["./data/costar-graph.json"],
  },
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
