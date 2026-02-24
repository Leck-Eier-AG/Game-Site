# Issue Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub issue forms for bug reports and feature requests to improve triage quality.

**Architecture:** Create two YAML issue forms in `.github/ISSUE_TEMPLATE` with required fields for key information and optional fields for context. No app code changes.

**Tech Stack:** GitHub Issue Forms (YAML).

---

### Task 1: Add Bug Report Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Test: none

**Step 1: Create the issue form**

Create `.github/ISSUE_TEMPLATE/bug-report.yml` with this content:

```yaml
name: Bug Report
description: Report a bug to help us improve
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug. Please fill out the details below.
  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: A clear and concise description of the bug.
      placeholder: What happened?
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: List the steps to reproduce the issue.
      placeholder: |
        1. Go to ...
        2. Click ...
        3. See error ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen.
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened.
    validations:
      required: true
  - type: input
    id: app_version
    attributes:
      label: App Version
      description: Which version are you running (e.g., v0.2.1, commit SHA)?
      placeholder: v0.2.1
    validations:
      required: false
  - type: input
    id: environment
    attributes:
      label: Environment
      description: OS, browser, and device if relevant.
      placeholder: "Ubuntu 22.04, Chrome 121, Desktop"
    validations:
      required: false
  - type: textarea
    id: logs
    attributes:
      label: Logs/Screenshots
      description: Paste relevant logs or screenshots.
      render: shell
    validations:
      required: false
  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched existing issues
          required: true
```

**Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/bug-report.yml
git commit -m "docs: add bug report issue form"
```

---

### Task 2: Add Feature Request Issue Form

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Test: none

**Step 1: Create the issue form**

Create `.github/ISSUE_TEMPLATE/feature-request.yml` with this content:

```yaml
name: Feature Request
description: Suggest an idea for this project
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for the suggestion! Tell us what you want to see.
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem are you trying to solve?
      placeholder: It is hard to...
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: What would you like to happen?
      placeholder: Add/Change/Remove ...
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Any alternative solutions or workarounds.
    validations:
      required: false
  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Screenshots, mockups, or examples.
    validations:
      required: false
  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched existing issues
          required: true
```

**Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/feature-request.yml
git commit -m "docs: add feature request issue form"
```

---

### Task 3: Verify

**Files:**
- Test: none

**Step 1: Manual verification**

Open GitHub → New issue → confirm both forms render correctly.

**Step 2: Commit (if needed)**

No commit needed unless changes were made.
