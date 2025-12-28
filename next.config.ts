import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Output standalone build for Docker deployment
  output: "standalone",
};

export default nextConfig;
