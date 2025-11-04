import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  // Note: Headers are configured in vercel.json for static export
  // Static export configuration for FHEVM dApp
};

export default nextConfig;

