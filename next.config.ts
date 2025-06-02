import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Updated for Next.js 15.x - serverComponentsExternalPackages moved to serverExternalPackages
  serverExternalPackages: ["@google/genai"],
  // Remove deprecated api config for Next.js 15.x - use route handlers instead
};

export default nextConfig;
