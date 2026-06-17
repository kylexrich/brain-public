---
title: "App Script Rules"
description: "app script scope, durable script ownership, temporary-script cleanup, dry-run/apply expectations, and Retell SDK runtime behavior."
order: 1
---

## Script Scope

- Scripts in this directory must be durable operator, repair, seed, export, or code-generation tools.
- Every runnable script under `app/src/scripts/` must either:
  - have an `app/package.json` script entry and current SOP/reference ownership under `docs/sop/`,
    `docs/product/`, `docs/reference/`, or `docs/graph-improvement/`; or
  - be explicitly treated as helper/data-only, such as shared support modules or static data consumed by
    a runnable script.
- Do not add regression checks, snapshot checks, or test harnesses here. Automated verification belongs under `app/src/__tests__/`.
- Temporary rollout scripts and one-off verification scripts do not belong under `app/src/scripts/`.
- Remove one-off rollout scripts after the rollout is complete and current production data no longer needs them.
- New mutating scripts should default to dry-run or require an explicit confirmation flag unless they are narrowly scoped setup/seed commands with an existing operator workflow.
- Read the script before running it. Honor environment-specific npm script names, dry-run/apply flags, and
  confirmation flags exactly.
- Scripts may be long-lived operational tools even when they are run rarely; keep names, flags, logging, and
  idempotency clear enough for a future operator to use safely.

## Primary References

- App package script definitions: `app/package.json`
- Current operator script SOP and deleted-script rationale: `docs/sop/app-operator-scripts.md`
- App automated test location: `app/src/__tests__/AGENTS.md`
- Rollout docs must not preserve temporary regression-check scripts: `docs/rollout/AGENTS.md`

## Retell SDK

`retell-sdk` v5+ auto-detects the Node.js runtime. No shim import is required.
