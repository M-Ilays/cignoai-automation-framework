# Utility Factories Reference

Use factory methods for actions and verifications so Allure logging and framework behavior remain consistent.

## PlaywrightActionFactory

| Method | Use when |
|---|---|
| `click(locatorInfo)` | Standard click |
| `forceClick(locatorInfo)` | Element is overlapped or not interactable normally |
| `doubleClick(locatorInfo)` | Double-click needed |
| `sendKeys(locatorInfo, value)` | Fill a text input |
| `sendKeysSequentially(locatorInfo, value)` | Type character-by-character, such as autocomplete |
| `clearText(locatorInfo)` | Select-all and Backspace to clear a field |
| `pressKey(locatorInfo, key)` | Send a keyboard key, such as `Enter` |
| `selectRadioButtonOrCheckBox(locatorInfo)` | Check a checkbox or radio |
| `deSelectRadioButtonOrCheckBox(locatorInfo)` | Uncheck a checkbox or radio |
| `selectFromDropdown(locatorInfo, optionText)` | Custom dropdown list |
| `searchAndSelect(locatorInfo, text, type?)` | Autocomplete or multi-select dropdown |
| `navigateToURL(url)` | Navigate to an absolute URL |
| `waitForSelector(locatorInfo)` | Wait for element to be attached, default 65 seconds |
| `waitForVisibility(locatorInfo, timeout?)` | Wait for element to be visible |
| `waitForURL(regex, timeout?)` | Wait for URL to match a pattern |
| `waitForDomLoad(timeout?)` | Wait for `domcontentloaded` |
| `waitForSec(seconds)` | Explicit pause, use sparingly |
| `scrollIntoView(locatorInfo)` | Scroll element into viewport |
| `scrollUntilVisible(locatorInfo, options?)` | Scroll page until element appears |
| `mouseHover(locatorInfo)` | Hover over element |
| `getText(locatorInfo)` | Read text content |
| `getInputValue(locatorInfo)` | Read input field value |
| `verifyText(locatorInfo, expected)` | Soft-assert element text contains expected |
| `embedFullPageScreenshot(description)` | Attach full-page screenshot to Allure |
| `refreshBrowser()` | Reload page |
| `uploadFile(locatorInfo, filePath)` | File upload through input |
| `dragAndDrop(source, target)` | Drag and drop |

## PlaywrightVerificationFactory

| Method | Use when |
|---|---|
| `expectElementExist(locatorInfo)` | Assert element is visible |
| `verifyNotExist(locatorInfo)` | Assert element is hidden |
| `verifyText(locatorInfo, expected)` | Soft-assert text content |
| `verifyValue(locatorInfo, expected)` | Soft-assert input value |
| `verifyTitle(expected)` | Assert page title |
| `assertAreEqual(expected, actual)` | Hard equality assertion |
| `assertAreNotEqual(expected, actual)` | Hard not-equal assertion |
| `assertAreTrue(actual)` | Assert boolean is truthy |
| `assertGreaterThan(expected, actual)` | Numeric comparison |
| `assertGreaterThanOrEqualTo(expected, actual)` | Numeric comparison |
| `assertStringsEqual(actual, expected)` | String contains assertion |
| `assertElementHasClass(locatorInfo, className)` | Assert CSS class present |
| `assertElementIsEnabled(locatorInfo)` | Assert element is enabled |
| `assertElementIsDisabled(locatorInfo)` | Assert element is disabled |
| `verifyRadioButtonIsChecked(locatorInfo)` | Assert radio or checkbox checked |
| `verifyLocatorsCount(locatorInfo, count)` | Assert visible element count is at least N |
| `verifyContains(haystack, needle)` | String contains check |
| `verifyUserHasAccess(url, shouldMatch)` | Assert current URL matches |
| `verifyFileDownload(locatorInfo)` | Assert file download triggered |
| `verifyPdfContent(locatorInfo, text)` | Assert downloaded PDF contains text |
| `isElementVisible(locatorInfo)` | Return boolean visibility |
| `waitForSelector(locatorInfo)` | Wait for element attached |
| `waitForVisibility(locatorInfo)` | Wait for element visible |
| `waitForElementToDisappear(locatorInfo)` | Wait for element detached |
| `waitForLoaderToDisappear()` | Wait for "Just a moment" loader |
| `waitForProcessingLoaderToDisappear()` | Wait for processing loader |
| `expectToPass(assertion, timeout?)` | Retry assertion until it passes |
| `ExpectDelegateToPass(delegate, ...)` | Retry delegate with custom timeout |
| `embedFullPageScreenshot(description)` | Screenshot to Allure |
| `logOrderNumber(locatorInfo, label)` | Log order number to Allure |
