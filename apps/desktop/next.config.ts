import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Tauri loads the exported app from disk in production; keep asset URLs relative.
  assetPrefix: "./",
  transpilePackages: ["@markidown/shared-types"],
};

export default nextConfig;
