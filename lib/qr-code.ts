// Shared QR code generation utility
import QRCode from 'qrcode';

// Simple in-memory cache to avoid regenerating the same QR code on every render
const qrCache = new Map<string, string>();
const QR_CACHE_MAX = 50;

/**
 * Generates a QR code data URL (base64 PNG) for the given data.
 * Works 100% offline — no external API dependency.
 * Results are cached in memory (up to 50 entries) to avoid redundant canvas work.
 */
export async function generateQRCodeUrl(data: string, size = 200): Promise<string> {
  const cacheKey = `${data}-${size}`;
  const cached = qrCache.get(cacheKey);
  if (cached) return cached;

  const dataUrl = await QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  // Evict oldest entry if cache is full
  if (qrCache.size >= QR_CACHE_MAX) {
    const firstKey = qrCache.keys().next().value;
    if (firstKey) qrCache.delete(firstKey);
  }
  qrCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Detect the local IP address via WebRTC.
 * Returns null if detection fails (does NOT fall back to localhost).
 */
export async function detectLocalIP(): Promise<string | null> {
  // Check sessionStorage first
  const storedIP = sessionStorage.getItem('karaoke-detected-ip');
  if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost' && !storedIP.endsWith('.local')) {
    return storedIP;
  }

  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const ip = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        pc.close();
        // Fallback: use hostname if it's a real IP
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.') && !hostname.endsWith('.local')) {
          resolve(hostname);
        } else {
          resolve(null);
        }
      }, 5000);

      pc.onicecandidate = (event) => {
        if (event?.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
          if (ipMatch && ipMatch[1]) {
            const detected = ipMatch[1];
            if (!detected.endsWith('.local') && detected !== '0.0.0.0' && !detected.startsWith('127.')) {
              clearTimeout(timeout);
              pc.close();
              sessionStorage.setItem('karaoke-detected-ip', detected);
              resolve(detected);
            }
          }
        }
      };
    });

    return ip;
  } catch {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.') && !hostname.endsWith('.local')) {
      return hostname;
    }
    return null;
  }
}

/**
 * Build the companion app connection URL for the given IP and optional profile ID.
 * Always uses the /mobile route so the companion gets the latest implementation.
 */
export function buildCompanionUrl(ip: string, port = 3000, profileId?: string): string {
  const base = `http://${ip}:${port}/mobile`;
  if (profileId) {
    return `${base}?profile=${encodeURIComponent(profileId)}`;
  }
  return base;
}
