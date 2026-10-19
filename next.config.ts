import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: false,
  allowedDevOrigins: ["26.19.67.150"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "media.valorant-api.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
