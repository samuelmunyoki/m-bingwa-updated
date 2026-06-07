import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["assets.aceternity.com"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
