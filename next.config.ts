import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
      {
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://ordsmusic.com https://www.ordsmusic.com https://*.wix.com https://*.wixsite.com",
          },
        ],
        source: "/book-consultation",
      },
      {
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://ordsmusic.com https://www.ordsmusic.com https://*.wix.com https://*.wixsite.com",
          },
        ],
        source: "/book/:slug",
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
