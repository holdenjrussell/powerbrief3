import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Allow large file uploads
    serverComponentsExternalPackages: [],
  },
  // Configure API routes to handle large files (up to 1GB for video uploads)
  api: {
    bodyParser: {
      sizeLimit: '1gb',
    },
    responseLimit: false,
  },
};

export default nextConfig;
