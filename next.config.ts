import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // sharp ships native binaries; keep it external so the bundler requires it at
  // runtime instead of trying to inline it (used by the wallpaper compositor).
  serverExternalPackages: ['sharp'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
};

export default nextConfig;
