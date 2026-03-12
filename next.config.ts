import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.instantdb.com',
      },
      {
        protocol: 'https',
        hostname: 'files-dev.instantdb.com',
      },
    ],
  },
  turbopack: {
    rules: {
      '*.ttf': {
        loaders: ['./loaders/binary-loader.js'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
