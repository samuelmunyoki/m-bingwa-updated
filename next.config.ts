import type { NextConfig } from "next";
import { APK_URL } from "./lib/app-version";

const nextConfig: NextConfig = {
  images: {
    domains: ["assets.aceternity.com"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/download/apk",
        destination: APK_URL,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
