
import { ArtilleryPage } from './artillery.page.js';
import { createLoginFixtures } from './artillery-fixtures.js';

export const config = {
  target: 'https://selectorshub.com/xpath-practice-page',
  engines: {
    playwright: {}
  }
};

export const scenarios = [
  {
    engine: 'playwright',
    testFunction: login
  },
];

// Function to be called by artillery scenario
export async function login(page, vuContext, events, test) {
  const { step } = test;

  // Example: Use fixtures if needed
  // const fixtures = await createLoginFixtures(page, test);

  const artilleryPage = new ArtilleryPage(page, test);

  await artilleryPage.login(page, step);
}

export function $rewriteMetricName(metricName, metricType) {
  // Example: group all metrics for URLs containing '/xpath-practice-page'
  if (metricName.includes('/xpath-practice-page')) {
    return 'browser.page.xpath-practice';
  } else if (metricName.includes('test_case')) {
    return 'browser.test_case.metrics';
  } else {
    return metricName;
  }
}


