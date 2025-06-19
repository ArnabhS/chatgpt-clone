import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://res.cloudinary.com/diskey6fm/image/upload/**')],
  },
};

export default nextConfig;
