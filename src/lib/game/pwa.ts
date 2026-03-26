// PWA Manifest and Service Worker Configuration
import { isTauri } from '@/lib/tauri-file-storage';
import { logger } from '@/lib/logger';

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
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/icon-512x512.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
  shortcuts: [
    {
      name: 'Quick Play',
      short_name: 'Play',
      description: 'Start a quick game',
      url: '/?action=quickplay',
    },
    {
      name: 'Party Mode',
      short_name: 'Party',
      description: 'Start party mode',
      url: '/?action=party',
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

  // Skip service worker in Tauri (not needed for desktop apps)
  if (isTauri()) {
    logger.info('[PWA]', 'Skipping Service Worker registration in Tauri mode');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.info('[PWA]', 'Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            logger.info('[PWA]', 'New version available! Refresh to update.');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    logger.error('[PWA]', 'Service Worker registration failed:', error);
    return null;
  }
}

// Check if app is installed (PWA mode)
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // In Tauri, the app is always "installed"
  if (isTauri()) return true;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Store for the deferred prompt - initialized immediately
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installListeners: Array<(available: boolean) => void> = [];

// IMPORTANT: Capture the beforeinstallprompt event IMMEDIATELY when this module loads
// This must happen BEFORE React hydrates to ensure we don't miss the event
if (typeof window !== 'undefined' && !isTauri()) {
  // Capture the event as early as possible
  window.addEventListener('beforeinstallprompt', (e) => {
    logger.info('[PWA]', 'beforeinstallprompt event captured!');
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Notify all listeners that install is now available
    installListeners.forEach(listener => listener(true));
  });

  // Also listen for app installed event
  window.addEventListener('appinstalled', () => {
    logger.info('[PWA]', 'App was installed');
    deferredPrompt = null;
    installListeners.forEach(listener => listener(false));
  });
}

// Subscribe to install availability changes
export function onInstallAvailabilityChange(callback: (available: boolean) => void): () => void {
  installListeners.push(callback);
  // Immediately notify of current state
  if (deferredPrompt) {
    callback(true);
  }
  // Return unsubscribe function
  return () => {
    installListeners = installListeners.filter(l => l !== callback);
  };
}

// Check if PWA install is currently available
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  // In Tauri, PWA install is never available (app is already installed natively)
  if (isTauri()) return false;
  // Check if we have a deferred prompt
  return deferredPrompt !== null;
}

// Check if we're in Tauri mode
export function isTauriMode(): boolean {
  return isTauri();
}

// Initialize PWA install (now mostly a no-op since we capture the event at module load)
export function initPWAInstall(): void {
  if (typeof window === 'undefined') return;
  if (isTauri()) {
    logger.info('[PWA]', 'Running in Tauri mode - PWA install not applicable');
    return;
  }
  logger.info('[PWA]', 'Install initialized, deferredPrompt available:', deferredPrompt !== null);
}

// Prompt the user to install the PWA
export async function promptPWAInstall(): Promise<{ success: boolean; message: string }> {
  // In Tauri, this should never be called (button should be hidden)
  if (isTauri()) {
    return { 
      success: false, 
      message: 'App is already installed as a desktop application.' 
    };
  }

  if (!deferredPrompt) {
    return { 
      success: false, 
      message: 'PWA installation is not available. Try using "Add to Home Screen" from your browser menu.' 
    };
  }
  
  try {
    logger.info('[PWA]', 'Prompting user for install...');
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    logger.info('[PWA]', 'User choice:', outcome);
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      return { success: true, message: 'App installed successfully!' };
    } else {
      return { success: false, message: 'Installation was cancelled.' };
    }
  } catch (error) {
    logger.error('[PWA]', 'Install prompt failed:', error);
    return { 
      success: false, 
      message: 'Installation failed. Please try using "Add to Home Screen" from your browser menu.' 
    };
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
    logger.error('[PWA]', 'Failed to cache song:', error);
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
