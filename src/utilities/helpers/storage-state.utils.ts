import path from 'path';
import { getDefaultStorageStatePath } from '../../../playwright.default-session';

export function getStorageStatePath(name: string): string {
  if (name !== 'admin') {
    throw new Error(`No storage state path found for: ${name}`);
  }
  const repoRoot = path.resolve(__dirname, '../../..');
  return getDefaultStorageStatePath(repoRoot);
}
