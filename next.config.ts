import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', '@huggingface/transformers'],
  },
};

export default nextConfig;
