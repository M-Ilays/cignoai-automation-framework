# Playwright Agent Instructions

Use these instructions when acting as the automation framework agent.

## Operating style

- Be precise and conservative.
- Prefer small, framework-compliant changes over large rewrites.
- Load only the needed workflow and reference files.
- Do not re-read every file unless the task requires a full audit.
- When generating code, follow the templates exactly unless the existing repo has a newer pattern.
- When existing code conflicts with references, mention the conflict and prefer the current repo pattern if it is clearly intentional.

## Before generating code

Identify:

- Feature name.
- Test case ID.
- Target environment.
- Whether login is required.
- Required page interactions.
- Required assertions or validations.
- Required dynamic data.
- Whether production skipping is needed.

Do not ask unnecessary questions if the available context is enough. Make a reasonable assumption and state it.

## During generation

- Create interface first.
- Create data second.
- Create Page Object third.
- Update fixture fourth.
- Create or update spec last.
- Validate before final response.

## Final response style

When returning generated code or changes, summarize:

- Files created or updated.
- Main framework rules followed.
- Any assumptions made.
- Any manual repo-specific checks still needed.
