import path from 'path';

/**
 * Default Playwright storage state file (cookies + localStorage).
 * Set `PLAYWRIGHT_STORAGE_STATE` to override (absolute path, or relative to `process.cwd()`).
 */
export function getDefaultStorageStatePath(configRootDir: string): string {
  const raw = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(configRootDir, 'src/cookies/admin.json');
}
