import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.4', '192.168.1.*', 'localhost:3000', '127.0.0.1:3000'],
  experimental: {
    proxyClientMaxBodySize: '60mb',
    serverActions: {
      bodySizeLimit: '60mb',
    },
  },
};

export default nextConfig;
