# Playwright Automation Framework

## Introduction

This README provides an overview and detailed explanation of the Playwright Automation Framework. It covers the directory structure, key components of the framework, and provides a detailed walkthrough of the login test case as an example. The purpose of this README is to help new developers understand the framework's architecture and workflow.

## Dependencies Used

- **Playwright**: A Node.js library to automate Chromium, Firefox, and WebKit with a single API.
- **Casual**: A library for generating fake data.
- **fs**: File system module for file handling.

## Prerequisites

### Node.js

1. Install [Node.js](https://nodejs.org/en/) (LTS version recommended).
2. During installation, ensure you check the option:  
   - [x] **Automatically install the necessary tools. Note that this will also install Chocolatey. The script will pop up in a new window after the installation completes.**

### Browsers

- Ensure the following browsers are installed:
  - Chrome
  - Firefox
  - Microsoft Edge

### Visual Studio Code

- Install [Visual Studio Code](https://code.visualstudio.com/download).

## Project Setup

### Option 1: Manual Download

1. **Download Project**:  
   - Click the **Code** button in this repository.
   - Select the **Download ZIP** option.
   - Extract the ZIP file.
   - Place the project folder in your desired location.

2. **Open Project**:  
   - Right-click on the folder and open it with Visual Studio Code.
   - Alternatively, open Visual Studio Code and drag the folder into the VS Code window.
   - Or, use `Ctrl+K Ctrl+O` to open the folder directly.

### Option 2: Cloning via GitBash

1. Navigate to the directory where you want to clone the project.
2. Open GitBash and execute the following command:

    ```bash
    git clone <repository-url>
    ```

## Running the Project

1. Open a new terminal in Visual Studio Code using `` Ctrl+Shift+` `` or go to the top bar, click **Terminal** > **New Terminal**.
2. Install the necessary packages:

    ```bash
    npm install
    npx playwright install
    ```

### Running Test Cases

#### Run All Test Cases with Allure Reporting

```bash
npm run test:dev:allure:open
```

## Run Specific Test Cases by Tag

```bash
npx playwright test src/specs/login.spec.ts --grep "@regression"
```

## Viewing Playwright Reports

```bash
npx playwright show-report
```


## DOs and DON'Ts

### DOs

1. **Keep Code Clean**: Run `npm run pretest` before committing to maintain code quality.
2. **Run Tests**: Use `npm run test:dev` for development tests and `npm run test:dev:allure` for detailed reports.

### DON'Ts

1. **Ignore Linting Errors**: Always fix errors before committing.
2. **Skip Pretest Step**: Ensure your code adheres to standards by running pretest.

## Conclusion

By following these guidelines and using this document as a reference, you can effectively work within the Playwright Automation Framework. Happy testing!
