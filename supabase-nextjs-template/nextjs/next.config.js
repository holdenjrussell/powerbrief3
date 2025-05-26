/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Configure API routes to handle large files
  api: {
    bodyParser: {
      sizeLimit: '1gb',
    },
    responseLimit: false,
  },
};

module.exports = nextConfig;
