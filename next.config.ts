import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  // The packaged runtime is read-only. Static pages are still emitted at build
  // time; ISR and image responses use Next's bounded memory cache at runtime.
  experimental: { isrFlushToDisk: false },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 95],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
