import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
