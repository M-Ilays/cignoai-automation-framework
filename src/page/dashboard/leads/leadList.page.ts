import { LocatorDetails } from '../../../interface/base/locator.interface';
import { PlaywrightActionsFactory } from '../../../utilities/playwright/playwright-actions.utils';
import { test, Page, TestInfo } from 'playwright/test';

export class LeadListPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly playwrightActionsFactory: PlaywrightActionsFactory;
  private readonly Locator: { [key: string]: LocatorDetails };

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.playwrightActionsFactory = new PlaywrightActionsFactory(this.page, this.testInfo);

    this.Locator = {
  
      SearchBox: {
        description: "Search input field to search for a lead by ID or keyword.",
        locator: page.getByRole('searchbox', { name: 'Search' }),
        // locator: page.locator("//span[@id='overviewgrid_searchbutton']"),

      },
      SearchButton: {
        description: "Button to execute the lead search action.",
        locator: page.getByRole('search', { name: 'Search' }),
      },
      EditLeadButton: {
        description: "Click to open the 'Edit Lead' form.",
        locator: page.getByRole('button', { name: 'Edit Lead' }),
      },
      RecruiterDropdown: {
        description: "Dropdown to assign a recruiter to the lead.",
        locator: page.getByRole('combobox').first(),
      },
      StatusDropdown: {
        description: "Dropdown to select the lead status.",
        locator: page.getByRole('combobox').nth(1),
      },
      SourceDropdown: {
        description: "Dropdown to select the lead source.",
        locator: page.getByRole('combobox').nth(2),
      },
      StateDropdown: {
        description: "Dropdown to set the priority level of the lead.",
        locator: page.locator("//select[@formcontrolname='StateID']")
      },
      MetropolitanAreaDropdown: {
        description: "Dropdown to select the metropolitan area.",
        locator: page.locator("//select[@formcontrolname='MetropolitanAreaId']")
      },
      editHeading: {
        description: "Heading to edit the lead.",
        locator: page.locator("//h1[normalize-space()='Edit Lead']")
      }

    };
  }

  public async leadListDropdowns(): Promise<void> {
    
    await test.step("Enter the value in Search Text Box", async () => {
      
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.SearchBox);
      await this.playwrightActionsFactory.click(this.Locator.SearchBox);
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.SearchBox);
      await this.playwrightActionsFactory.sendKeys(this.Locator.SearchBox, '306478');
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.SearchButton);
      await this.playwrightActionsFactory.click(this.Locator.SearchButton);
    
    });
    await test.step("Clicked on Search Button", async () => {
      await this.playwrightActionsFactory.waitForElementState(this.Locator.EditLeadButton, 'visible');
     await this.playwrightActionsFactory.click(this.Locator.EditLeadButton);
    });
    
    await test.step("Select campaign", async () => {
     
      await this.playwrightActionsFactory.waitForElementAndClick(this.Locator.RecruiterDropdown);
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.RecruiterDropdown);
      await this.playwrightActionsFactory.selectDropdownOption(this.Locator.RecruiterDropdown, '322'); 
    })

    await test.step("Select Referal source", async () => {
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.StatusDropdown);
      await this.playwrightActionsFactory.click(this.Locator.StatusDropdown);
      await this.playwrightActionsFactory.selectDropdownOption(this.Locator.StatusDropdown, '952');
    });
    await test.step("Select Advertisment Details", async () => {
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.SourceDropdown);
      await this.playwrightActionsFactory.click(this.Locator.SourceDropdown);
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.SourceDropdown);
      await this.playwrightActionsFactory.selectDropdownOption(this.Locator.SourceDropdown, '4066');
    });

    await test.step("Select state", async () => {
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.StateDropdown);
      await this.playwrightActionsFactory.click(this.Locator.StateDropdown);
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.StateDropdown);
      await this.playwrightActionsFactory.selectDropdownOption(this.Locator.StateDropdown,"Illinois")
    
    });
   
    await test.step("Select MetropolitanArea", async () => {
      await this.playwrightActionsFactory.waitForSec(2);
      await this.playwrightActionsFactory.waitForVisibility(this.Locator.MetropolitanAreaDropdown);
      await this.playwrightActionsFactory.selectDropdownOption(this.Locator.MetropolitanAreaDropdown, 'Chicago');
      await this.playwrightActionsFactory.click(this.Locator.editHeading);
    });
  }
}
