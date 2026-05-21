import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "loremflickr.com" },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
