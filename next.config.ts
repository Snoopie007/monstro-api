import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'standalone',

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  experimental: {
    largePageDataBytes: 128 * 1024, // 128KB
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'monstro-bucket.s3.us-east-2.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mymonstroapp.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.gstatic.com',
        pathname: '/**',
      }
    ]
  },
  serverRuntimeConfig: {
    maxHeaderSize: 32 * 1024, // 32KB
  },
  skipTrailingSlashRedirect: true,
  // output: 'standalone'
};

export default nextConfig;

