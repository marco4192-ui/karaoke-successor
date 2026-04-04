// Native FS - TypeScript wrappers for custom Tauri commands.
// These commands bypass the plugin ACL system because they are
// custom app commands (allowed by default in Tauri v2).

import { invoke } from '@tauri-apps/api/core';

// ---- Directory Entry ----
export interface NativeDirEntry {
  name: string;
  is_directory: boolean;
  is_file: boolean;
  path: string;
}

// ---- File Read ----

/** Read a file as base64-encoded bytes. Ideal for binary files (audio, video, images). */
export async function nativeReadFileBytes(filePath: string): Promise<string> {
  return invoke<string>('native_read_file_bytes', { filePath });
}

/** Read a file as a UTF-8 text string. */
export async function nativeReadFileText(filePath: string): Promise<string> {
  return invoke<string>('native_read_file_text', { filePath });
}

// ---- File Exists ----

/** Check if a file or directory exists. */
export async function nativeFileExists(filePath: string): Promise<boolean> {
  return invoke<boolean>('native_file_exists', { filePath });
}

// ---- Directory ----

/** List directory contents. */
export async function nativeReadDir(dirPath: string): Promise<NativeDirEntry[]> {
  return invoke<NativeDirEntry[]>('native_read_dir', { dirPath });
}

/** Create a directory (recursive). */
export async function nativeMkdir(dirPath: string): Promise<void> {
  return invoke<void>('native_mkdir', { dirPath });
}

// ---- File Write ----

/** Write base64-encoded bytes to a file. Parent directories are created automatically. */
export async function nativeWriteFileBytes(filePath: string, dataBase64: string): Promise<void> {
  return invoke<void>('native_write_file_bytes', { filePath, dataBase64 });
}

/** Write a text string to a file. Parent directories are created automatically. */
export async function nativeWriteFileText(filePath: string, content: string): Promise<void> {
  return invoke<void>('native_write_file_text', { filePath, content });
}

// ---- File Remove ----

/** Remove a single file. */
export async function nativeRemoveFile(filePath: string): Promise<void> {
  return invoke<void>('native_remove_file', { filePath });
}

/** Remove a directory recursively. */
export async function nativeRemoveDir(dirPath: string): Promise<void> {
  return invoke<void>('native_remove_dir', { dirPath });
}

// ---- Dialogs ----

/** Open a native folder picker. Returns the selected path or null. */
export async function nativePickFolder(title: string = 'Select Folder'): Promise<string | null> {
  return invoke<string | null>('native_pick_folder', { title });
}

/** Open a native save-file dialog. Returns the selected path or null. */
export async function nativePickFileSave(
  title: string,
  filterName: string,
  extensions: string[]
): Promise<string | null> {
  return invoke<string | null>('native_pick_file_save', { title, filterName, extensions });
}

/** Show a native message dialog. Returns true if acknowledged. */
export async function nativeMessage(
  title: string,
  message: string,
  kind: 'info' | 'warning' | 'error' = 'info'
): Promise<boolean> {
  return invoke<boolean>('native_message', { title, message, kind });
}

/** Show a native yes/no confirm dialog. Returns true if user chose Yes. */
export async function nativeConfirm(title: string, message: string): Promise<boolean> {
  return invoke<boolean>('native_confirm', { title, message });
}
