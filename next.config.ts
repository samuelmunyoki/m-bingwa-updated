import type { NextConfig } from "next";

// Update this URL each time you publish a new GitHub release
const LATEST_APK_URL =
  "https://github.com/TechEagle001/mbingwa-app/releases/download/v1.0.0/m-bingwa-v1.0.0.apk";

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
        destination: LATEST_APK_URL,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
