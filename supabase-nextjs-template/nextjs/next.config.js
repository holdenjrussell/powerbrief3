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
  // Add headers for FFmpeg support - modified to be less restrictive for media loading
  async headers() {
    return [
      {
        // Apply restrictive COEP only to specific routes that need FFmpeg
        source: '/api/ffmpeg/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // For all other routes, use a more permissive policy
        source: '/((?!api/ffmpeg).*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
