import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* to the main Narraverse backend in development
  async rewrites() {
    const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // Allow images from any origin (for character avatars, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Ensure CSS is properly handled
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
