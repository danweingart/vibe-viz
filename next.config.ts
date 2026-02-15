import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '**.seadn.io',
      },
    ],
  },

  // Compression is enabled by default in Next.js production builds
  // Vercel automatically serves with gzip/brotli based on client Accept-Encoding header
  // No explicit config needed - documented here for clarity

  // Optimize production builds
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Explicit gzip compression (default: true)
};

export default nextConfig;
