// Folder Scanner - Barrel re-exports
// This file was split into focused sub-modules.
// All original exports are re-exported here for backward compatibility.

// Types & constants
export type { ScannedSong, ScanResult } from '@/lib/parsers/scan-types';
export { COVER_PATTERNS, BACKGROUND_PATTERNS } from '@/lib/parsers/scan-types';

// Blob URL tracking
export { revokeAllScanBlobUrls } from '@/lib/parsers/blob-url-tracker';

// UltraStar metadata parsing (internal, not re-exported — only used by song-converter and folder-discovery)

// Media duration (internal, not re-exported — only used by song-converter)

// Folder discovery & scanning
export { isFileSystemAccessSupported, scanFolderWithPicker, scanFilesFromFileList } from '@/lib/parsers/folder-discovery';

// Song conversion
export { convertScannedSongToSong } from '@/lib/parsers/song-converter';
