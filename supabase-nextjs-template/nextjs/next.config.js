/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Server external packages configuration
  serverExternalPackages: [],
  // Simple webpack config for tldraw client-side only
  webpack: (config, { isServer }) => {
    // Only apply client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Suppress specific webpack warnings including Supabase realtime warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Critical dependency.*@supabase\/realtime-js/,
      /Module not found: Can't resolve.*realtime/,
    ];

    return config;
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
