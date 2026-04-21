import type { NextConfig } from "next";
import path from "path";

const SPA_ORIGIN = 'https://eat-this-8a13b.web.app'

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  async rewrites() {
    return {
      fallback: [
        { source: '/:path*', destination: `${SPA_ORIGIN}/:path*` },
      ],
    }
  },
};

export default nextConfig;
