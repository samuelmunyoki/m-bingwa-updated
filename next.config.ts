import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["assets.aceternity.com"], // Added hostname for next/image
  },
  /* other config options here */
  typescript: {
    // This will ignore TypeScript errors during builds
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
