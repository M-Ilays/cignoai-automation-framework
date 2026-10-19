import { LocatorInfo } from '@interface/base/locator.interface';
import { Page, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '@utilities/playwright/playwright-actions.utils';
import { addDays, addMonths, addYears, format } from 'date-fns';

export class CommonFunctionsFactory {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly playwrightActionsFactory: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorInfo };

  /**
   * @param page
   * @param testInfo
   */
  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;

    this.playwrightActionsFactory = new PlaywrightActionsFactory(
      this.page,
      this.testInfo,
    );

    this.locators = {
      accessToCommunityPopupCloseIcon: {
        description: 'Access to Community popup close icon',
        locator: this.page
          .frameLocator('iframe')
          .getByRole('dialog')
          .getByRole('img'),
      },
      accessToCommunityPopup: {
        description: 'Access to Community popup',
        locator: this.page
          .frameLocator('iframe')
          .getByText(
            'Access to Community SettingsBirds-eye view to your community. Edit your',
          ),
      },
    };
  }

  public async accessCommunitySettingsPopupHandler(): Promise<void> {
    await this.page.addLocatorHandler(
      this.locators.accessToCommunityPopup.locator,
      async () => {
        await this.playwrightActionsFactory.click(
          this.locators.accessToCommunityPopupCloseIcon,
        );
      },
    );
  }

  public async transformLocator(inputString: string): Promise<string> {
    const words = inputString
      .split(/[\s-]+/) // Split by one or more spaces or hyphens
      .filter((word) => word.trim() !== ''); // Remove any empty words

    const transformedWords = words.map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    const transformedString = transformedWords.join(' ');

    return transformedString; // Now returns a string instead of void
  }
}

export function getDateAhead(
  daysAhead: number,
  monthsAhead: number,
  yearsAhead: number,
): { day: number; month: number; year: number } {
  const currentDate = new Date();

  const targetDate = addYears(
    addMonths(addDays(currentDate, daysAhead), monthsAhead),
    yearsAhead,
  );

  const result = {
    day: targetDate.getDate(),
    month: targetDate.getMonth() + 1,
    year: targetDate.getFullYear(),
  };

  return result;
}

export async function formatDate(date: Date): Promise<string> {
  const dayName = format(date, 'EEEE');
  const monthName = format(date, 'MMMM');
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();

  const suffix =
    dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31
      ? 'st'
      : dayOfMonth === 2 || dayOfMonth === 22
        ? 'nd'
        : dayOfMonth === 3 || dayOfMonth === 23
          ? 'rd'
          : 'th';

  return `${dayName}, ${monthName} ${dayOfMonth}${suffix}, ${year}`;
}


