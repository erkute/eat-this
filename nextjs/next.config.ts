import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "eatthisdot.com" }],
        destination: "https://www.eatthisdot.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
