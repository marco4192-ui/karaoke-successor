import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// R53 — LAN-IPs dynamisch in allowedDevOrigins aufnehmen: Der Dev-Server
// (0.0.0.0) wird vom Handy über http://<LAN-IP>:3000 aufgerufen; Next 16's
// blockCrossSiteDEV weist /_next/-Anfragen mit fremder Origin (403) ab, wenn
// die IP nicht gelistet ist. Symptom: Die Companion-App bleibt nach dem
//QR-Scan auf „Loading companion app…" hängen (dynamische Chunks 403).
// Die IP-Menge wird zur Config-Ladezeit gelesen — funktioniert auf jedem
// Rechner (Windows-Dev wie Sandbox), ohne harte IPs einzutragen.
const lanIps = Object.values(networkInterfaces())
  .flatMap((list) => list ?? [])
  .filter((net) => net.family === "IPv4" && !net.internal)
  .map((net) => net.address);

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16's blockCrossSiteDEV rejects dev-resource requests (incl. the
  // Turbopack HMR websocket on /_next/webpack-hmr) whose Origin/Referer host
  // is not the server hostname or an allowed dev origin. The sandbox preview
  // gateway and local tooling access the app via 127.0.0.1 while the server
  // binds 0.0.0.0 — without this entry every fresh page load silently stalls
  // on the phase-1 loading screen (HMR socket dies with close code 1006).
  // R53: + alle aktuellen LAN-IPv4s (Companion-Handys im lokalen Netzwerk).
  allowedDevOrigins: ["127.0.0.1", "localhost", ...lanIps],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
