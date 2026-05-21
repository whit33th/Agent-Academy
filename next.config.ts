import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  allowedDevOrigins: ["26.19.67.150"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "media.valorant-api.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
