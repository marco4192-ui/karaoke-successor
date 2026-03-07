// PWA Manifest and Service Worker Configuration
export const PWA_MANIFEST = {
  name: 'Karaoke Successor',
  short_name: 'Karaoke',
  description: 'The ultimate karaoke experience with real-time pitch detection',
  start_url: '/',
  display: 'standalone',
  background_color: '#0a0a1a',
  theme_color: '#00ffff',
  orientation: 'any',
  categories: ['entertainment', 'music', 'games'],
  icons: [
    {
      src: '/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable any',
    },
  ],
  screenshots: [
    {
      src: '/screenshots/gameplay.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
      label: 'Gameplay Screen',
    },
    {
      src: '/screenshots/library.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
      label: 'Song Library',
    },
  ],
  shortcuts: [
    {
      name: 'Quick Play',
      short_name: 'Play',
      description: 'Start a quick game',
      url: '/?action=quickplay',
      icons: [{ src: '/icons/play-icon.png', sizes: '96x96' }],
    },
    {
      name: 'Party Mode',
      short_name: 'Party',
      description: 'Start party mode',
      url: '/?action=party',
      icons: [{ src: '/icons/party-icon.png', sizes: '96x96' }],
    },
  ],
  related_applications: [],
  prefer_related_applications: false,
};

// Service Worker registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available! Refresh to update.');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Check if app is installed
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Check if PWA install is available
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return 'BeforeInstallPromptEvent' in window;
}

// PWA Install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function initPWAInstall(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

// Offline storage for songs
export interface CachedSong {
  id: string;
  audioUrl: string;
  videoUrl?: string;
  cachedAt: number;
  size: number;
}

const CACHE_NAME = 'karaoke-cache-v1';

export async function cacheSong(song: { id: string; audioUrl?: string; videoUrl?: string }): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const urls: string[] = [];
    
    if (song.audioUrl) urls.push(song.audioUrl);
    if (song.videoUrl) urls.push(song.videoUrl);
    
    await cache.addAll(urls);
    return true;
  } catch (error) {
    console.error('Failed to cache song:', error);
    return false;
  }
}

export async function getCachedSong(songId: string): Promise<CachedSong | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    for (const request of keys) {
      if (request.url.includes(songId)) {
        const response = await cache.match(request);
        if (response) {
          return {
            id: songId,
            audioUrl: request.url,
            cachedAt: Date.now(),
            size: parseInt(response.headers.get('content-length') || '0'),
          };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function clearSongCache(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  
  await caches.delete(CACHE_NAME);
}

export async function getCacheSize(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
      }
    }
    
    return totalSize;
  } catch {
    return 0;
  }
}
