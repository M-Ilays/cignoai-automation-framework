---
name: freedompop-playwright-automation
description: use this skill when creating, updating, reviewing, validating, or auditing Playwright TypeScript automation tests in the FreedomPop framework. Trigger for requests involving new test generation, Page Object Model files, locators, fixtures, test data, specs, Allure reporting, environment handling, or framework compliance for the FreedomPop Playwright automation project.
---

# FreedomPop Playwright Automation

Use this as the routing file for the FreedomPop Playwright automation framework. Keep this file small. Load only the workflow or reference file needed for the current task.

## Core rules that always apply

- Use Playwright Test with TypeScript strict mode.
- Use the Page Object Model architecture.
- Every new feature requires the framework's five-layer structure.
- Specs must stay thin: orchestration only, no locators and no raw assertions.
- Page Objects own locators, actions, and verification calls.
- Every locator must use `LocatorInfo` with `description` and `locator`.
- Use `PlaywrightActionFactory` and `PlaywrightVerificationFactory`; do not use raw Playwright calls in Page Objects unless no factory method exists.
- Use path aliases instead of deep relative imports.
- Never hardcode credentials, URLs, or environment-specific values.
- Use dynamic test data utilities instead of hardcoded runtime data.
- Keep production-sensitive tests guarded with environment checks.

## Load the right workflow

- For creating a full new test feature, read `workflows/generate-new-test.md`.
- For adding another scenario to an existing feature, read `workflows/add-test-case.md`.
- For fixing or updating an existing automation test, read `workflows/update-existing-test.md`.
- For validating generated or edited code, read `workflows/validate-test.md`.
- For auditing the framework documentation after code changes, read `workflows/audit-framework.md`.

## Load the right reference

- For architecture, aliases, folders, naming, and conventions, read `references/core-framework.md`.
- For locator standards and optional element handling, read `references/locator-rules.md`.
- For action and verification factory methods, read `references/utility-factories.md`.
- For copy-ready code templates, read `references/templates.md`.
- For environment, production skipping, and dynamic data rules, read `references/environment-and-data.md`.
- For final compliance review, read `references/validation-checklist.md`.

## Agent behavior

For Claude-specific execution behavior, read `agents/playwright-agent.md`.
