// src/artillery/artillery.page.js

export class ArtilleryPage {
  constructor(page, testInfo) {
    this.page = page;
    this.testInfo = testInfo;
    
  }

  async login(page, step) {
    await step('Login', async () => {
      await page.goto('https://selectorshub.com/xpath-practice-page/');
      await page.getByRole('textbox', { name: 'Email' }).click();
      await page.getByRole('textbox', { name: 'Email' }).fill('test@gmail.com');
      await page.getByRole('textbox', { name: 'Email' }).press('Tab');
      await page.getByRole('textbox', { name: 'Password' }).fill('Admin123');
      await page.getByRole('textbox', { name: 'Enter your company' }).click();
      await page.getByRole('textbox', { name: 'Enter your company' }).fill('thirdera');
      await page.getByRole('spinbutton').click();
      await page.getByRole('spinbutton').fill('03423840425');
      await page.getByRole('textbox', { name: 'Country' }).click();
      await page.getByRole('textbox', { name: 'Country' }).fill('pakistan');
      await page.getByRole('button', { name: 'Submit' }).click();
    });
  }
}



