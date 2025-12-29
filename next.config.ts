import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // API proxy to GoFrame backend (for development)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/:path*',
      },
    ]
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gaap.cc',
      },
    ],
  },

  // SEO: Generate metadata for better search engine indexing
  // This structure allows plugins to inject custom metadata later

  // Allow development on custom domain
  allowedDevOrigins: ['gaap.local', 'gaap.cc'],
};

export default nextConfig;