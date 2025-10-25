# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) for Ora Admin Portal.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## Format

We use a simple format:

```markdown
# [Number]. [Title]

Date: YYYY-MM-DD
Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [001](./001-nextjs-app-router.md) | Use Next.js 15 with App Router | Accepted | 2025-10-23 |
| [002](./002-firebase-backend.md) | Use Firebase as Backend | Accepted | 2025-10-23 |
| [003](./003-offline-first-android.md) | Offline-First Architecture for Android | Accepted | 2025-10-10 |

## Creating a New ADR

1. Copy the template: `cp docs/adr/template.md docs/adr/XXX-title.md`
2. Fill in the template
3. Update this README with the new ADR
4. Create a PR for review
5. Once accepted, merge and update status

## Guidelines

- **When to create an ADR**: For significant architectural decisions that affect:
  - System structure
  - Technology choices
  - Data models
  - Security patterns
  - Performance strategies

- **When NOT to create an ADR**: For:
  - Minor implementation details
  - Coding style choices (use linter config)
  - Temporary experiments
  - Obvious choices with no alternatives

## Status Lifecycle

1. **Proposed**: Initial draft, open for discussion
2. **Accepted**: Decision is made and being implemented
3. **Deprecated**: No longer relevant but kept for historical context
4. **Superseded by ADR-XXX**: Replaced by a newer decision

## Resources

- [What is an ADR?](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ADR Tools](https://github.com/npryce/adr-tools)
- [When to Write an ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
