import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental config for serverless function region
  // Match Supabase region (ap-south-1 = Mumbai)
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
