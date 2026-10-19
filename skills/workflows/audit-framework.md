# Workflow: Audit Framework Documentation

Use this workflow after a PR is merged or when the user asks whether the skill is outdated.

## Audit triggers

Run this audit after any PR that:

- Adds a new Page Object, spec, data file, or interface.
- Adds or modifies a method in `PlaywrightActionFactory`.
- Adds or modifies a method in `PlaywrightVerificationFactory`.
- Adds a new utility in `src/utilities/`.
- Introduces a new fixture in `src/fixtures/page.fixtures.ts`.
- Changes environment handling.
- Adds a new shared interface.
- Changes the folder structure under `src/`.

## Audit checklist

1. Diff `src/utilities/playwright.actions.utils.ts` against `references/utility-factories.md`.
2. Diff `src/utilities/playwright.verifications.utils.ts` against `references/utility-factories.md`.
3. Diff `src/fixtures/page.fixtures.ts` against the fixture pattern in `references/templates.md`.
4. Scan `src/utilities/` for new utilities relevant to test authoring.
5. Scan `src/interfaces/` for new shared interfaces.
6. Run `find src -type d | sort` and compare against `references/core-framework.md`.
7. Check `.env.example` or `.env.demo` for new variables not documented.
8. Review two or three recently merged specs for pattern drift.
9. Update references or workflows if the framework pattern changed.

## Claude prompt for repo audit

Use this prompt when asking Claude to audit the live repo:

```text
Scan the current state of the framework against .claude/SKILL.md and the files under .claude/references and .claude/workflows. Tell me what is missing, outdated, or has changed. Propose targeted updates only.
```
