import { Locator } from '@playwright/test';

/** Canonical shape for locators passed to action/verification factories (see `skills/references`). */
export interface LocatorDetails {
  description: string;
  locator: Locator;
}

/** Alias matching reference framework naming (`LocatorInfo` in templates / validation checklist). */
export type LocatorInfo = LocatorDetails;

export type LocatorState = 'attached' | 'detached' | 'hidden' | 'visible';

