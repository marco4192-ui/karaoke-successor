/**
 * User-facing plain-text file download (R71).
 *
 * Same browser-anchor mechanism as downloadBackup() in lib/sync/backup.ts —
 * deliberately no Tauri fs-plugin here: this is a file the USER should pick
 * a home for (Documents folder, USB stick, password-manager import), not
 * app-internal storage. In the Tauri build the WebView handles the download
 * like the settings backup export does.
 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** YYYY-MM-DD (local time) for the "created on" line inside saved code files. */
export function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
