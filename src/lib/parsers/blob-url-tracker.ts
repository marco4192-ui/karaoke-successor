// Blob URL Tracker - Track all blob URLs created during scanning so they can be revoked on unmount

const scanBlobUrls = new Set<string>();

/** Create a blob URL and track it for later cleanup */
export function createTrackedBlobUrl(file: File | Blob): string {
  const url = URL.createObjectURL(file);
  scanBlobUrls.add(url);
  return url;
}

/** Revoke all blob URLs created during scanning */
export function revokeAllScanBlobUrls(): void {
  for (const url of scanBlobUrls) {
    URL.revokeObjectURL(url);
  }
  scanBlobUrls.clear();
}
