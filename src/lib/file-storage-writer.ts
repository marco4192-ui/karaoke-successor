// File Storage Writer - Storing song files to Tauri app data directory
// Extracted from tauri-file-storage.ts

import { writeFile, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs';
import { isTauri, sanitizeFileName } from '@/lib/file-storage-utils';

// Generate a unique folder name for a song
export function generateSongFolderName(title: string, artist: string): string {
  const sanitize = (str: string) =>
    str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 50);
  const sanitizedTitle = sanitize(title);
  const sanitizedArtist = sanitize(artist);
  return `${sanitizedArtist} - ${sanitizedTitle} (${Date.now()})`;
}

// Store song files persistently using Tauri's fs plugin
export async function storeSongFiles(
  songFolder: string,
  files: { audio?: File; video?: File; txt?: File; cover?: File }
): Promise<{ audioPath?: string; videoPath?: string; txtPath?: string; coverPath?: string }> {
  const result: { audioPath?: string; videoPath?: string; txtPath?: string; coverPath?: string } = {};

  if (!isTauri()) {
    if (files.audio) result.audioPath = URL.createObjectURL(files.audio);
    if (files.video) result.videoPath = URL.createObjectURL(files.video);
    if (files.txt) result.txtPath = URL.createObjectURL(files.txt);
    if (files.cover) result.coverPath = URL.createObjectURL(files.cover);
    return result;
  }

  try {
    await mkdir(`songs/${songFolder}`, { baseDir: BaseDirectory.AppData, recursive: true });

    const saveFile = async (file: File): Promise<string> => {
      const uint8Array = new Uint8Array(await file.arrayBuffer());
      const safeName = sanitizeFileName(file.name);
      const relativePath = `songs/${songFolder}/${safeName}`;
      await writeFile(relativePath, uint8Array, { baseDir: BaseDirectory.AppData });
      return relativePath;
    };

    if (files.audio) result.audioPath = await saveFile(files.audio);
    if (files.video) result.videoPath = await saveFile(files.video);
    if (files.txt) result.txtPath = await saveFile(files.txt);
    if (files.cover) result.coverPath = await saveFile(files.cover);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to store song files:', error);
  }

  return result;
}
