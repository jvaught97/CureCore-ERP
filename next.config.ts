import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // Increase limit for larger payloads
    },
  },
};

export default nextConfig;
