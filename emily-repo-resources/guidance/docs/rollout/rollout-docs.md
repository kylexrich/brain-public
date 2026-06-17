---
title: "Rollout Document Rules"
description: "rollout authority, default no-rollout rule, gate criteria, roles, required content, lifecycle, and anti-patterns."
order: 1
---

## Authority

An active rollout doc is the deploy-time operator runbook for one change. It captures cut-over instructions for a change that cannot ship as a single commit and a single deploy. Completed rollout docs are historical operator evidence. Rollout docs are not current product, billing, or architecture truth unless a current source-of-truth document separately says so.

Rollout docs live at `docs/rollout/<slug>.md`; completed rollout docs may live under `docs/rollout/completed/`.

Exclude `docs/rollout/` from current-product doc-alignment by default unless the user explicitly asks to validate or edit rollout artifacts.

## Default: No Rollout Doc

Most tasks ship as one commit (or a `$worktree-task` single-commit roll-up), one deploy, optionally followed by one Prisma migration and/or one backfill script. That fits most work and does not need a rollout doc.

Do not write one "just in case". A pure single-deploy change does not get one.

## Roles And Execution Model

- The AI prepares the rollout end-to-end in the worktree. During the `$worktree-task` (`/worktree-task`) session, the AI authors every code change, every migration file, every backfill script, every cleanup script, and the rollout doc itself, and lands them as a sequential commit chain via `$phase-loop` (`/phase-loop`) - one commit per plan phase, in plan order. After the session, the worktree contains a fully prepared rollout. The AI is not blocked from creating multiple commits in this mode; multi-commit chains are exactly what `$phase-loop` exists for.
- The human operator performs the rollout itself. Checking out each commit, running deploy commands (`deploy:beta` / `deploy:prod` / `cdk deploy`), running migration and backfill scripts in production, making external-system changes (AWS Secrets Manager edits, Stripe dashboard work, third-party config), and observing each wait/verify condition are all done manually by the user. The AI must not invoke deploy commands or make external-system changes on the user's behalf. See `.ai/guidance/repository-rules.md#strict-no-deployments-ai-only`.
- The rollout doc is what the human reads at deploy time. Each phase tells the human which commit to check out, what to deploy, which external-system actions to take before/after, which scripts to run, what to wait for, and how to roll back. The AI authors this doc; the human follows it.

Workflow ownership:
- `$worktree-task` (`/worktree-task`) sequencing: `{.ai,.claude,.codex}/skills/worktree-task/SKILL.md`
- Phase commit policy: `{.ai,.claude,.codex}/skills/phase-loop/SKILL.md`
- Rollout gate evaluation during planning: `{.ai,.claude,.codex}/skills/task-planning/SKILL.md`

## When A Rollout Doc Is Required

Write a rollout doc the moment the deploy involves more than the default shape. Concretely, write one if any of the following is true:

- Two or more commits must land in a specific order (for example, expand -> migrate -> contract, or write-both -> read-from-new -> drop-old).
- Destructive or non-additive schema change that interacts with running code: drop column, drop table, adding NOT NULL on a populated column, type change, or renaming anything still being read or written by the previous version.
- A backfill must run between code deploys, or its intermediate state would break either the old or the new code.
- Coordinated deploy ordering across packages beyond the normal `cdk` -> `app` -> `client` flow (for example, a server flag must be on before clients read it, or vice versa).
- External-system actions are required before or after deploy for the rollout to succeed. This includes AWS Secrets Manager changes, Stripe changes, Retell/Twilio/provider dashboard or API changes, DNS, IAM, OAuth app config, or any console-only change that the deploy depends on.
- Downtime longer than a few minutes, or any planned read-only window.
- Rollback is not a simple `git revert` plus redeploy: reverting the code would leave persisted data or external state in a bad shape.

If none of the above is true, do not write a rollout doc. Keep it simple.

## What The Doc Must Contain

Use `docs/rollout/TEMPLATE.md` as the structure. Each phase must specify:

1. Commit content: what lands in the commit (or set of commits) for that phase, and what is intentionally not in it.
2. Deploy scope: `app`, `cdk`, `client`, or a specific subset.
3. External-system actions: any console, dashboard, or API work outside the repo, and whether each is run before or after the deploy.
4. Post-deploy actions inside the repo: migrations, backfills, flag flips, and durable operator scripts. Do not use rollout docs to preserve temporary regression-check scripts; executable verification belongs in `app/src/__tests__/`.
5. Wait or verify condition before the next phase can start.
6. Per-phase rollback: the concrete steps to undo this phase alone, including reverting any external-system changes, without unwinding earlier phases.

Keep it short. Prefer plain ordered steps over prose. If the rollout would naturally fit in three bullet points, write three bullet points.

## Lifecycle

- Decision time (`$task-planning`): the gate is evaluated and the phase shape is decided (number of phases, rough purpose of each). The context doc's `Rollout:` field records the decision. Explicit plan steps are added for authoring the rollout doc and for each migration/backfill/cleanup script. The rollout doc itself is not authored at this stage; its concrete contents only become clear during implementation.
- Authoring time (step execution, inside `$worktree-task`): the rollout doc and each migration/backfill/cleanup script are produced as plan steps run. The rollout doc may start as a skeleton early in the plan and be refined as each phase lands.
- Commit time (inside `$worktree-task`): `$phase-loop` (`/phase-loop`) commits at each plan phase boundary - one commit per phase. The worktree ends up with a fully prepared end-to-end commit chain ready for the human to step through.
- Deploy time: the human operator executes each phase in order using the now-complete rollout doc. Do not start the next phase until the current phase's wait or verify condition is met.
- Completion: once all phases are complete in production, mark the doc `Status: Complete` at the top. Leave it in place for historical reference, or move it under `docs/rollout/completed/` if cleanup is desired.

## Anti-Patterns

- Do not write a rollout doc "just in case". Adding noise here costs review time and dilutes the docs that actually matter.
- Do not invent phases to feel safe. If the change genuinely fits in one commit and one deploy, the answer is one commit and one deploy. Multi-phase rollouts have real cost: intermediate state, partial rollbacks, longer cycle time.
- Do not duplicate the task context doc here. This doc covers deploy steps and ordering only. Rationale and design live in `docs/tasks/`.
- Do not bury external-system actions in prose. If a phase needs a Stripe change or a Secrets Manager update, it gets its own bullet under that phase's "External-system actions" field, with explicit before/after timing.
