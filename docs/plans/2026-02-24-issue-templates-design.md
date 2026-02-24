# Issue Templates Design (2026-02-24)

## Goal
Add structured GitHub issue forms for bug reports and feature requests to improve triage quality and consistency.

## Scope
- Create GitHub issue forms for bug reports and feature requests.
- Use required fields for core details (title, description, repro steps, expected/actual).

## Non-Goals
- App code changes.
- CI changes.
- Custom issue triage automation.

## Approach
- Add `.github/ISSUE_TEMPLATE/bug-report.yml` with required fields for description, steps to reproduce, expected/actual behavior, environment, and optional logs/screenshots.
- Add `.github/ISSUE_TEMPLATE/feature-request.yml` with required problem statement and proposed solution, plus optional alternatives and context.

## Files
- `.github/ISSUE_TEMPLATE/bug-report.yml`
- `.github/ISSUE_TEMPLATE/feature-request.yml`

## Validation
- Manual: open GitHub “New issue” and verify both forms render with required fields.
