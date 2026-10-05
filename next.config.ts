import type { NextConfig } from "next";
import { networkInterfaces } from "os";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

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

// R55 — DuckDNS-Domains als erlaubte Dev-Origin: Läuft der Server mit einem
// echten Let's-Encrypt-Zertifikat (Settings → Mobilgerät → DuckDNS), rufen
// Handys die Companion-App über https://<sub>.duckdns.org auf — ohne diese
// Einträge würde Next 16's Dev-Modus die /_next/-Chunks mit fremder Origin
// abweisen (403, dasselbe Symptom wie R53). Der Wildcard-Eintrag deckt JEDE
// DuckDNS-Subdomain ab (kein Neustart nach der Einrichtung nötig); die
// konkret konfigurierte Domain wird zusätzlich explizit gelistet.
const duckDnsOrigins: string[] = ["*.duckdns.org"];
try {
  const domainConfPath = join(process.cwd(), "certs", "https-domain.json");
  if (existsSync(domainConfPath)) {
    const domainConf = JSON.parse(
      readFileSync(domainConfPath, "utf8"),
    ) as { domain?: unknown };
    if (typeof domainConf.domain === "string" && domainConf.domain) {
      duckDnsOrigins.push(domainConf.domain);
    }
  }
} catch {
  // State-Datei unlesbar/defekt — Wildcard reicht als Fallback.
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16's blockCrossSiteDEV rejects dev-resource requests (incl. the
  // Turbopack HMR websocket on /_next/webpack-hmr) whose Origin/Referer host
  // is not the server hostname or an allowed dev origin. The sandbox preview
  // gateway and local tooling access the app via 127.0.0.1 while the server
  // binds 0.0.0.0 — without this entry every fresh page load silently stalls
  // on the phase-1 loading screen (HMR socket dies with close code 1006).
  // R53: + alle aktuellen LAN-IPv4s (Companion-Handys im lokalen Netzwerk).
  // R55: + *.duckdns.org (echte HTTPS-Domain, siehe oben).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...lanIps,
    ...duckDnsOrigins,
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
