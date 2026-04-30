---
name: debug
description: Swarm-diagnose any reported bug by running a mixed-model investigation swarm, synthesizing an evidence-backed root cause, and, when requested, implementing a verified fix. Use for bugs in any codebase or environment: local apps, CI failures, preview/staging/prod issues, hosted systems, libraries, CLIs, services, infrastructure, or flaky tests.
---

# Debug — Swarm First

Run a mixed-model swarm for every reported bug.

## Non-negotiables

- Start with the newest evidence and work backward.
- During investigation, every investigator stays **read-only** in **all** scopes.
- Every finding must be an **evidence packet** with:
  - evidence
  - interpretation
  - confidence
  - corroboration / conflict
- When practical, include the exact command, query, or log snippet, not just a reference.
- Mark anything unproven as `[UNVERIFIED]`.

## Environment mapping

Map the project's actual environments explicitly before spawning, for example:
- `local`
- `ci`
- `preview`
- `staging`
- `beta`
- `production`
- customer-hosted or region-specific environments

Record:
- the exact environment label
- target systems
- expected evidence sources
- log / metrics / state surfaces to inspect

## Model strategy

Use the `Debugging / swarm investigations`, `sessions_spawn field mapping`, and `Parallelism rule` sections of `shared/docs/sop/SUB-AGENT-MODEL-STRATEGY.md`.

For debugging specifically:
- **Opus high** orchestrates the swarm and synthesis
- investigators are a **mix** of Opus high and Codex xhigh
- **Opus high** challenges the leading root-cause hypothesis before the fix begins
- **Codex xhigh** makes the final root-cause / fix decision and implements when needed


## Swarm plan

Spawn the **core 6** every time. Add optional investigators when the bug calls for them.

**Default investigators:** 6
**Expanded swarm:** 7–8

### Core 6

| Agent | Model | Mission |
| --- | --- | --- |
| Code Path Tracer | Codex xhigh | Trace every plausible entry point and end-to-end path. Flag suspicious branches, transformations, null handling, retries, and error paths with exact `file:line` evidence. |
| Logs & Timeline Analyst | Opus high | Inspect every relevant log/output source, starting with the newest entries. Correlate errors, warnings, stack traces, timestamps, and request IDs with the report. |
| Reproduction & Regression Owner | Codex xhigh | Reproduce the failure when possible. Capture the exact failing command/request/test and observed output. Later verify whether the proposed fix closes the same path. |
| Change Archaeologist | Opus high | Review recent commits, diffs, migrations, dependency bumps, and config changes on affected paths. Find the last known-good state. |
| Hypothesis Challenger | Opus high | Challenge the leading theories. Look for alternate explanations, hidden assumptions, missing evidence, and bug archetypes the other agents might miss. |
| Config / Runtime Auditor | Codex xhigh | Audit env/config, feature flags, lockfiles, stale artifacts, platform mismatches, resource limits, and runtime assumptions. |

### Optional investigators

| Agent | Model | Spawn when | Mission |
| --- | --- | --- | --- |
| State Inspector | Codex xhigh | The bug touches DB/cache/files/persistent state | Inspect state, relationships, timestamps, lifecycle transitions, and corruption risks using read-only inspection only. |
| Infrastructure Scout | Opus high | The bug involves deployed/runtime/platform behavior | Inspect deploy history, service/container health, queues, load balancers, DNS, TLS, metrics, traces, and resource pressure. |

## Before you spawn

Capture the bug report clearly:
- observed behavior
- expected behavior
- reproduction steps
- exact failing command / request / test when known
- timeframe
- scope / environment
- affected users/entities/IDs
- exact errors or symptoms

Discover enough project context for the swarm to move fast:
- applicable `AGENTS.md`, README, contributing docs, runbooks, incident docs
- language/framework/runtime
- key directories/files
- log sources
- test framework and commands
- state stores
- deployment/infrastructure surface

Pass only the useful discoveries to the swarm.

## Spawn instructions

Spawn all selected investigators **simultaneously** with `sessions_spawn` using:
- `runtime: subagent`
- `model: opus`, `thinking: high` for Opus roles
- `model: codex`, `thinking: xhigh` for Codex roles
- `label`: a stable role label such as `debug-code-path`, `debug-logs-timeline`, `debug-repro`, `debug-change-archaeologist`, `debug-hypothesis`, or `debug-config-runtime`
- `cwd`: the relevant project root / working directory

Give each investigator:
- the full bug report
- the mapped scope / environment
- the discovered project context
- its exact mission
- the evidence rules above
- a reminder to read applicable `AGENTS.md` / runbooks before deep investigation on touched areas
- a reminder to stay read-only during investigation

Require this output format:
1. **Investigated** — files, logs, commands, queries
2. **Findings** — each finding as an evidence packet:
   - Evidence
   - Interpretation
   - Confidence
   - Corroboration / conflict
3. **Theory** — likely root cause, or `no confirmed root cause`
4. **Unknowns** — blocked checks or missing evidence

Agents do not coordinate with each other. The orchestrator synthesizes.

## Orchestrator workflow

1. Parse the report and map the actual environment / evidence sources.
2. Read repo instructions / runbooks relevant to the affected paths.
3. Spawn the mixed-model swarm in parallel.
4. Wait for every selected agent result.
5. Synthesize by evidence strength. Prefer corroborated findings over clever guesses.
6. Challenge the leading root-cause hypothesis as Opus high: argue against it, look for contradictory evidence, and surface better alternatives if they exist.
7. If deterministic reproduction or multiple independent evidence streams support one explanation, name **one confirmed root cause**.
8. Otherwise report `no confirmed root cause` and rank the leading theories.
9. If the fix is non-obvious or the user wants code changes, spawn a **Codex xhigh final-decision pass** with the full synthesized evidence plus the Opus challenge analysis.
10. If the user wants a fix, use **Codex xhigh** to implement it.
11. Verify with the same reproduction path, tests, and relevant logs/metrics.

## Investigation report

Use this structure:
- **Bug summary** — observed, expected, scope, timeframe, severity
- **Environment mapping** — exact environment label, target systems, evidence sources
- **Agent findings** — one subsection per investigator, with evidence packets
- **Corroboration / conflicts** — where agents agree or disagree
- **Root cause** — one confirmed root cause, or `no confirmed root cause`
- **Leading theories** — ranked if root cause is not yet confirmed
- **Impact** — affected scope, frequency, blast radius
- **Fix plan** — mitigation, root fix, test plan, monitoring
- **Unknowns** — explicit gaps, blocked checks, human questions

## Project-agnostic discovery

Before spawning, locate the project's real surface area:
- stack files: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, etc.
- logs: app logs, system logs, container logs, structured logging config
- tests: `test/`, `tests/`, `spec/`, `__tests__/`, framework configs
- state: ORM configs, migrations, connection settings, cache/queue configs
- deploy surface: Docker, compose, k8s, Terraform, CI/CD, cloud resources, monitoring config

## Checklist reference

Use `CHECKLIST.md` in this directory for investigation coverage and fix verification.

## Done when

- [ ] A mixed-model investigation swarm ran
- [ ] Every finding is captured as an evidence packet or marked `[UNVERIFIED]`
- [ ] The reproduction owner captured the exact failing path when possible
- [ ] The root cause is explicit, or `no confirmed root cause` is stated honestly
- [ ] The fix direction targets specific files or systems when a fix was requested
- [ ] Verification covers the exact bug path
- [ ] Unknowns are documented
