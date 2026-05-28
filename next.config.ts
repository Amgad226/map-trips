import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/map-trips",
  assetPrefix: "/map-trips",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;