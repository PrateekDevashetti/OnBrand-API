import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@onbrand/core"],
  serverExternalPackages: ["playwright-core", "postgres", "cheerio"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // playwright-core reads browsers.json/package.json at require time; the tracer misses them.
  outputFileTracingIncludes: { "/**": ["../../node_modules/playwright-core/**/*"] },
  images: { unoptimized: true },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, X-API-Key, Content-Type" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
