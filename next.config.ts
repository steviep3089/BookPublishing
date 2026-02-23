import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.209"],
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
