> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `cli/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `/cli` Brain CLI Guide for AI Contributors

This directory is Kyle's personal TypeScript CLI. It uses oclif to orchestrate local files, OAuth tokens, Apple Music and Sonos integrations, stream-processing pipelines, contact resolution, and repo tooling.

Apply `AGENTS.md` at the repo root too. That file owns universal repo rules such as path-formatting, AGENTS-writing, and documentation-deduplication standards. This file adds the CLI-specific coding and command guidance.

## Repository Overview

- Node/TypeScript CLI with oclif command discovery.
- ESM package (`"type": "module"`) with `module: "NodeNext"` and `moduleResolution: "NodeNext"`.
- Current command topics are `contact`, `music`, `repo`, `stream`, and `token`.
- This is one-shot automation tooling, not a long-running service. Optimize for clear orchestration, explicit side effects, and maintainable local scripts over framework-heavy architecture.

## Directory Layout

- `cli/bin/` — CLI entrypoints and bundled helper executables.
- `cli/commands/<topic>/` — oclif command files. One default-exported command class per file.
- `cli/lib/music/` — reusable Apple Music and Sonos integration logic.
- `cli/lib/stream/` — reusable stream pipeline, transcript, YouTube, and file helpers.
- `cli/lib/shared/` — cross-domain helpers shared by multiple command areas.
- `cli/vendor/` — vendored third-party binaries. Do not edit unless the task is explicitly about maintaining bundled tooling.
- `cli/dist/` — generated build output. Never edit by hand.

## oclif Conventions and Command Shape

- Each command lives in `cli/commands/<topic>/<name>.ts` and default-exports an oclif `Command` subclass.
- Define `static description`, `static flags`, and `static args` on the class.
- It is normal to keep command-local constants, interfaces, and helper functions in the same file above the command class.
- Commands are allowed to be substantial when the flow is cohesive and command-specific. For example, `cli/commands/contact/resolve.ts` is ~400 LOC and `cli/commands/stream/update-description.ts` is ~700 LOC; that is acceptable because each file owns one complete command flow.
- Extract logic to `cli/lib/` when at least one of these is true:
  - the logic is reused across commands
  - the code models a durable external integration or protocol
  - the command file becomes materially harder to read without extraction
- `cli/lib/music/applemusic-lib.ts` and `cli/lib/stream/pipeline-utils.ts` are good examples of large, cohesive shared modules.
- Dependency direction is one-way: `cli/commands/` may import from `cli/lib/`, but `cli/lib/` must never import from `cli/commands/`.
- Keep `cli/lib/shared/` genuinely cross-domain. If code only serves one domain, keep it in that domain's folder.

## [STRICT] Import and Module Rules

- Use ESM syntax only.
- All relative imports must use `.js` specifiers, even from `.ts` source files.
  - Correct: `../../lib/stream/pipeline-utils.js`
  - Incorrect: `../../lib/stream/pipeline-utils`
- Use `node:` imports for Node built-ins.
- Do not introduce CommonJS `require`, `module.exports`, or extensionless relative imports.
- Do not edit files under `cli/dist/`; regenerate them with the build.

## [STRICT] Naming

- Use intention-revealing names that encode the domain concept, not vague placeholders.
  - Prefer `streamDir`, `obsStem`, `speakerIp`, `musicUserToken`, `chunkSizeBytes`.
  - Avoid `data`, `info`, `temp`, `value`, `result2`, or similarly vague names unless the scope is tiny and obvious.
- Encode units, formats, and constraints in identifiers when ambiguity could cause misuse.
  - Prefer `timeoutMs`, `durationSec`, `phoneNumberE164`, `outputFile`, `streamDate`.
- Name booleans as predicates or states.
  - Prefer `isComplete`, `needsIngest`, `shouldIncludeAlbum`, `hasOutputFile`.
- Keep vocabulary stable within a domain. If an external API uses different terminology, translate once at the boundary and keep internal names consistent.
- Use kebab-case filenames for commands and utility modules.
- Do not force one class per file in `cli/lib/`. A lib file may export multiple tightly related helpers, types, and classes when that keeps an integration coherent.

## [STRICT] TypeScript Discipline

- `cli/tsconfig.json` runs in strict mode. Do not work around the type system.
- Prefer explicit types at module boundaries: exported functions, command option objects, reusable interfaces, and stable external payloads.
- Inference is fine for obvious local values. Do not add noisy annotations to every trivial local just for ceremony.
- Current code sometimes uses `Record<string, any>` for dynamic JSON-like payloads and pipeline state. That is acceptable only near flexible external boundaries or intentionally schema-light state objects. Narrow quickly and introduce named interfaces once a shape becomes stable or reused.
- Avoid new `any` usage unless there is a real boundary reason and a tighter type is impractical.
- Prefer `unknown` or boundary-specific interfaces before data enters business logic.
- Do not cast just to silence TypeScript. Fix the model, add a guard, or narrow the shape.
- Keep import casing exact; NodeNext and macOS can hide casing mistakes until later.

## [STRICT] Anti-Fragmentation

- Keep related logic together. This CLI is small enough that extra files are often worse than a slightly longer command or module.
- Do not split files just to satisfy an arbitrary line target.
- Local helpers, small interfaces, and constants belong beside the command or module that owns them.
- Extract to `cli/lib/` only when the code is reused, represents a durable integration boundary, or materially improves readability.
- Do not create micro-files like one-off `types.ts`, `constants.ts`, or single-helper utility files unless they hold a real cohesive unit.
- Large files are acceptable when they stay linear and domain-focused. `cli/lib/music/applemusic-lib.ts` and `cli/lib/stream/pipeline-utils.ts` are intentionally large because centralizing that logic improves consistency.

## [GUIDELINE] Function Design and Control Flow

- Use guard clauses and keep the happy path obvious.
- Let commands orchestrate. Small helper functions in the same file can own parsing, normalization, file selection, and protocol substeps.
- Prefer pure helpers for transforms and normalization; keep side effects explicit near the call site.
- For this one-shot CLI, synchronous filesystem and subprocess calls are normal when the operation is short and bounded and the sync flow is clearer.
- Split a function when it mixes unrelated responsibilities or becomes hard to read, not merely because it is long.

## [STRICT] Internal Trust and Impossible States

- Validate and normalize untrusted input at the CLI, file, env, network, or subprocess boundary. After that, trust the typed internal value instead of re-checking it everywhere.
- Do not add defensive branches for states that cannot actually occur at that point in the flow.
- If the types say a value is optional but the command contract requires it, fix the type or boundary parsing instead of scattering impossible-state checks downstream.

## [GUIDELINE] Function Contracts, Abstraction, and Size

- Keep exported helpers and reusable command utilities explicit about inputs, outputs, and side effects.
- Use one abstraction level per function when practical; avoid mixing CLI parsing, business rules, formatting, and subprocess orchestration in one blob unless the flow stays genuinely linear and readable.
- Treat frequent scrolling, mixed responsibilities, or mixed abstraction levels as the signal to refactor. Roughly ~150 lines is a strong smell, not a hard cap.

## [STRICT] Side Effects and State

- Make file writes, subprocess execution, network calls, time-dependent behavior, and device control obvious in names and call structure.
- Do not mutate input parameters unless the function contract makes that mutation explicit.
- Avoid ad hoc shared mutable module state. Keep state local, pass it explicitly, or encapsulate it behind a small abstraction with clear ownership.

## [GUIDELINE] Parameters and Behavioral Switching

- Prefer 0-3 parameters. If a function needs more than 5 positional parameters, switch to a typed options object or split the function.
- If call sites become hard to read before that point, switch to named options sooner.
- Avoid boolean flags that materially change behavior; use separate functions or an explicit mode/options shape when the branches are meaningfully different.

## [STRICT] Deduplication and Dead Code

- Reuse existing helpers, constants, output-shape builders, and parsing logic before creating new copies.
- Keep a single source of truth for shared behavior; do not maintain parallel implementations without a clear reason.
- Remove dead code, stale branches, and misleading comments when you find them. Do not keep commented-out code as a fallback.

## [STRICT] Comments

- Write self-explanatory code first.
- Allowed comments:
  - non-obvious rationale or platform quirks
  - automation/file-format contract notes
  - actionable TODOs with a concrete follow-up
  - brief notes around unavoidable external API or binary oddities
- Remove comments that restate the code, narrate obvious flow, or preserve dead code.
- Preserve useful human-authored rationale comments when they explain a real constraint; update them if they go stale.

## [GUIDELINE] Errors and Boundary Handling

- Let `cli/lib/` throw descriptive errors. Let commands decide exit codes and user-facing output.
- Translate errors at the command boundary into the command's chosen contract: human-readable text or structured JSON.
- Do not silently swallow failures except in deliberate probe helpers where absence is expected, such as safe existence checks.
- When a command mutates pipeline state or output files, preserve stable error fields like `reason` and `details` where that contract already exists.
- Fail clearly when required binaries, token files, or upstream credentials are missing.

## [STRICT] stdout/stderr Contract Discipline

- Decide whether a command is machine-facing or human-facing before changing it.
- Machine-facing commands must keep stdout stable and parseable.
  - `cli/commands/contact/resolve.ts` emits single-line JSON.
  - Most `cli/commands/stream/*.ts` commands emit formatted JSON via shared helpers.
- Human-facing commands may print plain-text progress or summary lines.
  - Repo tooling and token refresh commands follow this pattern.
- Prefer explicit `process.stdout.write(...)` and `process.stderr.write(...)` when output shape matters.
- If a command emits JSON, use shared JSON formatters such as `formatJson` or `jsonDumps` so newline and indentation stay consistent.
- Do not mix incidental progress logs into stdout for JSON commands. Put diagnostics on stderr or behind an explicit mode/flag.
- Preserve exit-code semantics. Several automation-facing commands write structured error objects to stdout and then exit non-zero; keep that behavior consistent unless you are intentionally changing the contract.
- Treat output-shape changes as breaking changes for automation.

## Command Safety Classification

Default rule: if a command writes files, touches credentials, controls devices, or talks to live services, treat it as live and do not run it without clear user intent.

### Safe / repo-local

- `npm run build`
- `npm run type-check`
- `npm run lint`
- `brain repo agents-header`
- `brain repo sync-ai`

### Read-only but live/private data access

- `brain contact resolve` — reads local Address Book data and may query Google Contacts
- `brain music applemusic` — reads Apple Music account/library data
- `brain stream find-source` — queries YouTube metadata without changing remote state

### Side-effecting local pipeline/file operations

- Most other `brain stream *` commands write files, update pipeline JSON, or cache local results
- `brain stream discover` reads live YouTube metadata and can create or update local stream work directories
- `brain stream download`, `brain stream chunk-transcript`, `brain stream analyze-stream`, `brain stream merge-extractions`, and `brain stream resolve-source` all mutate local outputs or pipeline state
- `brain stream transcribe` is a standalone manual utility that mutates local files only; the nightly pipeline does not call it

### Side-effecting external/live systems

- `brain music play-*` — changes Sonos queue or transport state
- `brain stream update-description`, `brain stream update-title`, and `brain stream youtube-auth` — talk to YouTube and/or update remote state
- `brain token refresh-*` — rotates OAuth tokens and rewrites local credential/config files

If you are unsure which bucket a new command belongs in, classify it conservatively as live.

## External Tools and Integrations

- This CLI intentionally shells out to local tools and platform CLIs such as `ffmpeg`, `ffprobe`, `whisper-cli`, `curl`, `gog`, and `sonos-pr3`. That is normal here.
- Keep binary names and paths explicit and fail with clear errors when prerequisites are missing.
- Prefer small adapter/helper functions around external tools over scattering subprocess argument construction everywhere.
- Before adding a new dependency, check `cli/package.json` and Node's standard library first.
- Do not vendor new binaries or edit `cli/vendor/` unless the task is explicitly about maintaining bundled tooling.

## Development Workflow

- Install dependencies in `cli/` with `npm install`.
- Run commands in development with `npm run brain -- <command>`.
- Verify changes with:
  - `npm run type-check`
  - `npm run lint`
  - `npm run build` when the change could affect emitted output, runtime discovery, or generated `dist/` files
- oclif discovers commands from `cli/commands/` via file path. Add new commands by creating `cli/commands/<topic>/<name>.ts` with a default-exported `Command` class.
- This package currently has no formal test suite. Normal verification is type-check + lint + the smallest safe manual command run that exercises the changed path.
- Do not hand-edit generated build output in `cli/dist/`.

## Change Discipline

- Prefer focused changes inside the owning domain rather than wide cross-cutting refactors.
- Keep refactors behavior-preserving unless the task explicitly includes a behavior change.
- Prefer small, reversible refactors with validation checkpoints over large rewrites.
- When touching automation-facing stream commands, review neighboring stream commands and shared helpers so output shape and pipeline-state semantics remain consistent.
- When editing repo tooling, remember that `brain repo agents-header` and `brain repo sync-ai` are the source of truth for precedence headers and `CLAUDE.md` stubs.
- Leave unrelated cleanup alone unless it directly blocks the task or is necessary to keep the touched area coherent.
