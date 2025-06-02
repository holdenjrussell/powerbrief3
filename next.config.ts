import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Moved from experimental.serverComponentsExternalPackages for Next.js 15 compatibility
  serverExternalPackages: [],
};

export default nextConfig;
