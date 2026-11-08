import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/reset",
        destination: "/reset",
      },
      {
        source: "/api/slots",
        destination: "/slots",
      },
      {
        source: "/api/bookings",
        destination: "/bookings",
      },
      {
        source: "/api/bookings/:id",
        destination: "/bookings/:id",
      },
    ];
  },
};

export default nextConfig;
