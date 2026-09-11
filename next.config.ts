import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16's blockCrossSiteDEV rejects dev-resource requests (incl. the
  // Turbopack HMR websocket on /_next/webpack-hmr) whose Origin/Referer host
  // is not the server hostname or an allowed dev origin. The sandbox preview
  // gateway and local tooling access the app via 127.0.0.1 while the server
  // binds 0.0.0.0 — without this entry every fresh page load silently stalls
  // on the phase-1 loading screen (HMR socket dies with close code 1006).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
