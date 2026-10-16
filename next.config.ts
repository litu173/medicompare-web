import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Prescription uploads at checkout (max 5 MB, validated in the action).
    serverActions: {
      bodySizeLimit: "6mb",
      // Public test link through a Cloudflare quick tunnel (see README "Share a public link").
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
