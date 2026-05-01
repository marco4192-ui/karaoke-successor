import React from 'react';

// Re-exported from canonical icon source
export {
  MusicIcon,
  MicIcon,
  PhoneIcon,
  SettingsIcon,
  TrophyIcon,
  SparkleIcon,
  EditIcon,
  WebcamIcon,
  FolderIcon,
  InfoIcon,
  TrashIcon,
  LanguageIcon,
  PaletteIcon,
  PlusIcon,
  CheckIcon,
} from '@/components/icons';

// CloudUploadIcon — variant with different SVG paths than the one in @/components/icons
// (used by library-tab; the canonical version is used by character components)
export function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}

// KeyboardIcon — variant with slightly different paths (ry="2", narrower spacebar)
export function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M8 16h8" />
    </svg>
  );
}
