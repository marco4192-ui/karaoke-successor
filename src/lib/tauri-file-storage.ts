// Tauri File Storage - Persistent file storage for imported songs
// This module handles copying imported files to app data directory
// so they persist across app restarts

import { save, readTextFile, BaseDirectory, exists, mkdir } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';

// Check if running in Tauri
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Dynamic import for Tauri APIs
async function getTauri() {
  if (!isTauri()) return null;
  return await import('@tauri-apps/api/core');
}

// Copy a file to the app's persistent data directory
export async function copyFileToAppData(
  sourcePath: string,
  relativePath: string
): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    const result = await tauri.invoke<string>('copy_file_to_app_data', {
      sourcePath,
      relativePath,
    });
    return result;
  } catch (error) {
    console.error('Failed to copy file to app data:', error);
    return null;
  }
}

// Get the app data directory path
export async function getAppDataPath(): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('get_app_data_path');
  } catch (error) {
    console.error('Failed to get app data path:', error);
    return null;
  }
}

// Check if a file exists in app data
export async function fileExistsInAppData(relativePath: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    return await exists(relativePath, { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Failed to check file existence:', error);
    return false;
  }
}

// Get a file URL for playback (file:// URL)
export async function getFileUrl(relativePath: string): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('get_file_url', {
      relativePath,
    });
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return null;
  }
}

// Read file as base64 (for small files or fallback)
export async function readFileAsBase64(relativePath: string): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('read_file_as_base64', {
      relativePath,
    });
  } catch (error) {
    console.error('Failed to read file as base64:', error);
    return null;
  }
}

// List all imported song folders
export async function listImportedSongs(): Promise<string[]> {
  const tauri = await getTauri();
  if (!tauri) return [];

  try {
    return await tauri.invoke<string[]>('list_imported_songs');
  } catch (error) {
    console.error('Failed to list imported songs:', error);
    return [];
  }
}

// Generate a unique folder name for a song
export function generateSongFolderName(title: string, artist: string): string {
  // Sanitize and create a folder name
  const sanitize = (str: string) => 
    str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 50);
  
  const sanitizedTitle = sanitize(title);
  const sanitizedArtist = sanitize(artist);
  const timestamp = Date.now();
  
  return `${sanitizedArtist} - ${sanitizedTitle} (${timestamp})`;
}

// Store song files persistently using Tauri's fs plugin
export async function storeSongFiles(
  songFolder: string,
  files: {
    audio?: File;
    video?: File;
    txt?: File;
    cover?: File;
  }
): Promise<{
  audioPath?: string;
  videoPath?: string;
  txtPath?: string;
  coverPath?: string;
}> {
  const result: {
    audioPath?: string;
    videoPath?: string;
    txtPath?: string;
    coverPath?: string;
  } = {};

  if (!isTauri()) {
    // Browser mode: create blob URLs
    if (files.audio) result.audioPath = URL.createObjectURL(files.audio);
    if (files.video) result.videoPath = URL.createObjectURL(files.video);
    if (files.txt) result.txtPath = URL.createObjectURL(files.txt);
    if (files.cover) result.coverPath = URL.createObjectURL(files.cover);
    return result;
  }

  // Tauri mode: Save files to app data directory
  try {
    // Create songs directory
    await mkdir(`songs/${songFolder}`, { 
      baseDir: BaseDirectory.AppData, 
      recursive: true 
    });
    
    const saveFile = async (file: File, type: string): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const relativePath = `songs/${songFolder}/${file.name}`;
      
      // Save using Tauri fs plugin
      await save(relativePath, { 
        baseDir: BaseDirectory.AppData,
        contents: uint8Array,
      });
      
      return relativePath;
    };

    if (files.audio) {
      result.audioPath = await saveFile(files.audio, 'audio');
    }
    if (files.video) {
      result.videoPath = await saveFile(files.video, 'video');
    }
    if (files.txt) {
      result.txtPath = await saveFile(files.txt, 'txt');
    }
    if (files.cover) {
      result.coverPath = await saveFile(files.cover, 'cover');
    }
  } catch (error) {
    console.error('Failed to store song files:', error);
  }

  return result;
}

// Get a playable URL for a stored file
export async function getPlayableUrl(relativePath: string): Promise<string> {
  if (!isTauri()) {
    // Browser mode - the path should already be a blob URL
    return relativePath;
  }

  // In Tauri, convert the app data path to a URL the webview can load
  try {
    const appDataPath = await getAppDataPath();
    
    if (appDataPath) {
      // Create a file URL that Tauri's webview can access
      const fullPath = `${appDataPath}/${relativePath}`;
      return convertFileSrc(fullPath);
    }
  } catch (error) {
    console.error('Failed to get playable URL:', error);
  }

  // Fallback: return the relative path
  return relativePath;
}

// Read stored file content as text (for txt files)
export async function readStoredTextFile(relativePath: string): Promise<string | null> {
  if (!isTauri()) {
    // Browser mode - can't read blob URLs as text easily
    return null;
  }

  try {
    return await readTextFile(relativePath, { 
      baseDir: BaseDirectory.AppData 
    });
  } catch (error) {
    console.error('Failed to read text file:', error);
    return null;
  }
}
