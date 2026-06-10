import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/metoda", destination: "/method", permanent: true },
      { source: "/regulamin", destination: "/terms-of-service", permanent: true },
      { source: "/prywatnosc", destination: "/privacy-policy", permanent: true },
    ];
  },
};

export default nextConfig;
