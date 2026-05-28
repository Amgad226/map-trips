import type { NextConfig } from "next";
import dotenv from "dotenv"
dotenv.config();
const nextConfig: NextConfig = {
  basePath: process.env.BASE_PATH  ?? "/map-trips",
  assetPrefix: process.env.ASSET_PREFIX ?? "/map-trips",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
