// Type augmentations for WebKit/Blink-specific APIs used in Tauri's WebView
// These APIs are available in Chromium-based browsers but not in TypeScript's lib

/** webkitRelativePath on File — used by folder-scanner.ts */
interface File {
  readonly webkitRelativePath?: string;
}

/** webkitGetAsEntry on DataTransferItem — used by folder-scan-tab.tsx */
interface DataTransferItem {
  webkitGetAsEntry?(): FileSystemEntry | null;
}

/** .values() on FileSystemDirectoryHandle — used by folder-scanner.ts */
interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>;
}
