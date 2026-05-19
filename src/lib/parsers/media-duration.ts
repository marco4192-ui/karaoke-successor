// Media Duration - Get duration from audio/video files (with proper cleanup)

import { createTrackedBlobUrl } from '@/lib/parsers/blob-url-tracker';

// Get audio duration (with proper cleanup)
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    let blobUrl: string | null = null;

    audio.onloadedmetadata = () => {
      const duration = audio.duration * 1000;
      // Cleanup blob URL
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resolve(duration);
    };

    audio.onerror = () => {
      // Cleanup blob URL on error
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load audio'));
    };

    blobUrl = createTrackedBlobUrl(file);
    audio.src = blobUrl;
  });
}

// Get video duration (with proper cleanup)
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let blobUrl: string | null = null;

    video.onloadedmetadata = () => {
      const duration = video.duration * 1000;
      // Cleanup blob URL
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resolve(duration);
    };

    video.onerror = () => {
      // Cleanup blob URL on error
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video'));
    };

    blobUrl = createTrackedBlobUrl(file);
    video.src = blobUrl;
  });
}
