import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
