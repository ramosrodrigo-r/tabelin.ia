import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/workspace/sql", destination: "/workspace", permanent: true },
      { source: "/workspace/regex", destination: "/workspace", permanent: true },
      { source: "/workspace/scripts", destination: "/workspace", permanent: true },
      { source: "/workspace/templates", destination: "/workspace", permanent: true },
      { source: "/workspace/file-analysis", destination: "/workspace", permanent: true },
      { source: "/workspace/ocr", destination: "/workspace", permanent: true }
    ];
  }
};

export default nextConfig;
