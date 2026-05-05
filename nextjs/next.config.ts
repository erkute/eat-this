import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),

  images: {
    // Sanity already serves WebP via ?auto=format. The custom loader hits
    // cdn.sanity.io directly with width-modulated query params, so the
    // default /_next/image proxy is skipped. Wired globally via loaderFile
    // because per-<Image> `loader` props can't cross the Server → Client
    // component boundary in App Router.
    loader: "custom",
    loaderFile: "./lib/sanityImageLoader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
};

export default withNextIntl(nextConfig);
