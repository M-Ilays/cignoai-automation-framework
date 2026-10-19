# Cigno FE QA Automation Framework

This repository contains the Cigno front-end quality-assurance automation workspace. It is used to support browser-based testing and includes Playwright-related execution artifacts, test data, environment configuration, and generated Allure reports.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/config/` | Local environment configuration. Keep secrets in `.env` files and never commit them. |
| `src/data/test-data/` | Test data used by the automation flows. |
| `src/cookies/` | Local browser session data. This directory is ignored by Git. |
| `allure-report/` | Generated Allure report output. |
| `playwright-report/` | Generated Playwright report output. |
| `test-results/` | Test execution results and attachments. |
| `.playwright-mcp/` | Browser exploration and Playwright MCP artifacts. |

Generated reports, browser sessions, logs, local environment files, and test results are excluded through [`.gitignore`](./.gitignore).

## Requirements

- Node.js and npm
- Access to the Cigno application environment under test
- Valid test credentials and environment settings supplied through a local `.env` file

## Configuration

Create or update the local environment file under `src/config/` with the values required by your test environment. Do not commit credentials, tokens, or other sensitive values.

Use an example environment file for sharing configuration names and documentation without sharing secrets:

```text
src/config/.env.example
```

## Running tests

Install the project dependencies and run the test command defined by the project manifest:

```powershell
npm install
npm test
```

If Playwright browsers are not installed locally, install them with:

```powershell
npx playwright install
```

The exact test scripts and test selection should be maintained in the project `package.json`.

## Reports

After a test run, generated reports can be opened with the relevant project command. For example:

```powershell
npx playwright show-report
```

Allure reports can be served with the Allure CLI when Allure results are available:

```powershell
allure serve allure-results
```

## Git workflow

Work from the `public-main` branch unless another branch is specifically required. Before pushing changes:

```powershell
git status
git pull --rebase
git push
```

Review generated files and local configuration before committing to ensure that secrets and machine-specific artifacts are not included.
