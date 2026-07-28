'use client';

import dynamic from 'next/dynamic';

// Dynamic import Toaster with ssr: false to avoid Radix portal hydration
// issues in the Tauri webview environment (fixes React error #418).
const Toaster = dynamic(
  () => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })),
  { ssr: false }
);

export function ToasterClient() {
  return <Toaster />;
}
