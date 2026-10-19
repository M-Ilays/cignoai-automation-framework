import { mergeTests } from '@playwright/test';
import { leaderTest } from './leader-page.fixtures';

export const test = mergeTests(
  leaderTest,
);
