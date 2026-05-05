import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),

  images: {
    // Sanity already serves WebP via ?auto=format. We use a custom loader
    // (lib/sanityImageLoader.ts) per-Image so the default /_next/image
    // proxy is skipped — the CDN URL is hit directly with width-modulated
    // query params for responsive srcset.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
};

export default withNextIntl(nextConfig);
