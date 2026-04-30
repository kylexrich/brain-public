# API Stability Contract

This contract constrains **what the skill does** when making fixes—not what it flags in user's uncommitted changes. If the user changed the API, that was intentional.

**Core principle:** Don't break the frontend.

## The Rule

When this skill makes changes, if a change would require frontend code changes to maintain functionality, update `common/openapi.yaml` first and note the frontend impact.

## What This Means

- Changing response/request shapes used in client/ → update OpenAPI first
- Removing/renaming fields used in client/ → update OpenAPI first
