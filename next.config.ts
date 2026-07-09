import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb", // AI estimate photos (resized client-side)
    },
  },
};

export default nextConfig;
