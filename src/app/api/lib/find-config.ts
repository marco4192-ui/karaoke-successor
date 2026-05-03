import { access, constants } from 'fs/promises';
import path from 'path';

/**
 * Shared utility to locate the AI config file (.z-ai-config).
 * Searches in CWD first, then HOME directory.
 */
export async function findAIConfigFile(): Promise<string | null> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const paths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
  ];

  for (const p of paths) {
    try {
      await access(p, constants.R_OK);
      return p;
    } catch {
      // File doesn't exist or not readable
    }
  }
  return null;
}
