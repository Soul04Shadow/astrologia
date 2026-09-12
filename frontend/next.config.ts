import type { NextConfig } from "next";

const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
