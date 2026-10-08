import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

if (process.env.VERCEL_ENV === "production" && !process.env.API_ORIGIN) {
  throw new Error("API_ORIGIN must be set for production builds");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
