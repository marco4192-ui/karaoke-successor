// Native FS - TypeScript wrappers for custom Tauri commands.
// These commands bypass the plugin ACL system because they are
// custom app commands (allowed by default in Tauri v2).

import { invoke } from '@tauri-apps/api/core';

// DO-NOT-CHANGE: Use a regex that only matches `..` as a standalone path segment
// (preceded/followed by a path separator or string boundary). A naive `path.includes('..')`
// would falsely reject valid filenames containing `...` (e.g., "...Baby One More Time").
const PATH_TRAVERSAL_RE = /(^|[\\/])\.\.([\\/]|$)/;

/** Reject paths containing directory traversal sequences (`..`) or null bytes. */
function validatePath(path: string): void {
  if (PATH_TRAVERSAL_RE.test(path) || path.includes('\0')) {
    throw new Error(`[NativeFS] Path traversal or null byte detected — rejecting path: ${path}`);
  }
}

// ---- Directory Entry ----
interface NativeDirEntry {
  name: string;
  is_directory: boolean;
  is_file: boolean;
  path: string;
}

// ---- File Read ----

/** Read a file as base64-encoded bytes. Ideal for binary files (audio, video, images). */
export async function nativeReadFileBytes(filePath: string): Promise<string> {
  validatePath(filePath);
  return invoke<string>('native_read_file_bytes', { filePath });
}

/** Read a file as a UTF-8 text string. */
export async function nativeReadFileText(filePath: string): Promise<string> {
  validatePath(filePath);
  return invoke<string>('native_read_file_text', { filePath });
}

// ---- File Exists ----

/** Check if a file or directory exists. */
export async function nativeFileExists(filePath: string): Promise<boolean> {
  validatePath(filePath);
  return invoke<boolean>('native_file_exists', { filePath });
}

// ---- Directory ----

/** List directory contents. */
export async function nativeReadDir(dirPath: string): Promise<NativeDirEntry[]> {
  validatePath(dirPath);
  return invoke<NativeDirEntry[]>('native_read_dir', { dirPath });
}

// ---- File Write ----

/** Write a text string to a file. Parent directories are created automatically. */
export async function nativeWriteFileText(filePath: string, content: string): Promise<void> {
  validatePath(filePath);
  return invoke<void>('native_write_file_text', { filePath, content });
}

// ---- Dialogs ----

/** Open a native folder picker. Returns the selected path or null. */
export async function nativePickFolder(title: string = 'Select Folder'): Promise<string | null> {
  return invoke<string | null>('native_pick_folder', { title });
}

/** Open a native file picker for opening an existing file. Returns the selected path or null. */
export async function nativePickFileOpen(
  title: string,
  filterName: string,
  extensions: string[]
): Promise<string | null> {
  return invoke<string | null>('native_pick_file_open', { title, filterName, extensions });
}

/** Open a native save-file dialog. Returns the selected path or null. */
export async function nativePickFileSave(
  title: string,
  filterName: string,
  extensions: string[]
): Promise<string | null> {
  return invoke<string | null>('native_pick_file_save', { title, filterName, extensions });
}
