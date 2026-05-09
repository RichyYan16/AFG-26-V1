import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@xenova/transformers', '@huggingface/transformers'],
};

export default nextConfig;
