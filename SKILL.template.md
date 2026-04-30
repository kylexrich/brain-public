---
name: <skill-name>
description: "<The agent reads ONLY this field to decide whether to load the skill. Include: (1) what it does, (2) trigger phrases/contexts/file types, (3) what NOT to use it for. Third person. Be slightly pushy to avoid under-triggering.>"
---

<!--
  TEMPLATE USAGE NOTES (delete this block in your final skill)

  Guiding principles:
  - The agent is already smart. Only add what it wouldn't know on its own.
  - Match specificity to fragility: prescriptive where it matters, flexible where it doesn't.
  - Write whatever best achieves the skill's objective — procedural steps, exact output specs, or both.
  - If a step is repeatable and deterministic with clear inputs and outputs, implement it as a brain CLI
    command rather than prose instructions. Skills orchestrate; stable operations should be code.
  - Keep SKILL.md lean. Offload anything large or non-trivial to sibling files: evaluation criteria,
    quality rubrics, business rules, file templates, content likely to change independently, or anything that would
    clutter the execution flow. By default, sibling files live in the skill's own folder unless
    instructed otherwise. Reference them inline in the steps where they're needed.
    NEVER duplicate information across this document and referenced documents.

  Sections marked (optional) — delete if they don't apply.

  Conventions used throughout this template:
    <placeholder>         natural language to replace
    `<placeholder>`       a value that will be code: param name, path, type, command
    `<!-- ... -->`        author guidance — delete all comment blocks in your final skill
-->

# <Skill Title>

**Mission:** <1–3 sentences: what this skill accomplishes and the outcome it guarantees when successful.>

---

## Interface

### Inputs

```yaml
<param_1>:
  type: <string | boolean | number | array | object>
  required: true
  description: <What it is.>
  constraints: <Format, valid range, must-exist rules, etc.>
 
<param_2>:
  type: <string | boolean | number | array | object>
  required: false
  default: <value>
  description: <What it is.>
  constraints: <Behavior when absent or edge-case notes.>
```

### Outputs

<!-- Add an entry per file (or file pattern). Count: 1, 0-1 (conditional), or N.
     If a created/edited file has a strict structure, it MUST have a sibling template file
     (e.g., .jsonc, .template.md) referenced via the template field. Do NOT inline templates in SKILL.md. -->

```yaml
<output_name_1>:
  op: create          # create | edit | delete | "create, edit"
  path: <path or pattern, e.g., "{stream_dir}/{stream_key}_vod.mp4">
  count: 1            # 1 | 0-1 | N
  description: <What it contains, what changes and why, or other high-level context.>
  template: —         # path/to/template (e.g., .jsonc, .template.md) or "—" if none

<output_name_2>:
  op: create          # create | edit | delete | create, edit
  path: <path or pattern, e.g., "{stream_dir}/{stream_key}_vod.mp4">
  count: 1            # 1 | 0-1 | N
  description: <What it contains, what changes and why, or other high-level context.>
  template: —         # path/to/template (e.g., .jsonc, .template.md) or "—" if none
```

### Response Format

<!-- Optional. Delete if the skill only produces files with no conversational output. -->

<What this skill returns when it finishes — JSON, plain text, a file path, structured message, etc.>

### Failure Modes (optional)

<!-- Include when the caller needs to handle failures differently depending on what went wrong.
     Format freely — a table, a list, or prose. For each failure: what went wrong, whether it's
     recoverable, and what the caller should do. -->

<describe how this skill fails and what to do about it>

---

## Preconditions (optional)

Stop immediately if any of the following are not met — do not proceed to execution:

- <required tool, binary, file, permission, or upstream output>

---

## Progress Checklist (optional)

Copy this checklist and check off each step as you complete it.
Step names here must match the `###` step headers in Execution below.

```
- [ ] 1. <Step name>
- [ ] 2. <Step name>
- [ ] N. Verify
```

---

## Execution

<!--
  Each step should do one thing. If you can't give it a single clear name, split it.
  If a step is genuinely complex, move it to a sibling skill or reference file.

  Step numbering:
  - By default, number steps in their headers: "### 1. Name", "### 2. Name".
  - Omit numbering when steps form a graph rather than a sequence — i.e., when
    conditional branches jump to other steps, skip steps, or loop back. Numbers
    imply a linear order and become misleading when execution can fork.
  - Use best judgment: if numbering makes the flow clearer, include it;
    if it would cause confusion, leave it out.

  Mix and match the step constructs below. Delete what you don't use.
  Each block shows the exact markdown to write — copy, fill in blanks, repeat as needed.
  Reference sibling files inline in the steps where they're needed (e.g., "Read `rubric.md`...").
  Bold labels (When / Otherwise / Branch / Until / Guard) are structural keywords — keep them.

  For tool/CLI calls, add something like this to the relevant step (or bash, zsh, javascript, etc):
   ```sh
   <command with {placeholders} for runtime variables>
   ```
   **Expect:** <Exit code, output file/shape, or stdout pattern.>
   **On fail:** <Retry N times | skip | abort | surface error. Omit if default is "abort.">

  ── STEP (unconditional) ────────────────────────────────────────────────────

  ### 1. <Name>

  1. <action>
  2. <action>

  ── CONDITIONAL STEP (if / else) ────────────────────────────────────────────

  ### 2. <Name>

  **When:** <condition>

  1. <action>
  2. <action>

  **Otherwise:**

  1. <action> _(or: Skip this step.)_

  ── DECISION STEP (multi-branch — Fallback required) ────────────────────────

  ### 3. <Name>

  **Branch A — <Label>**
  When: <condition>
  1. <action>

  **Branch B — <Label>**
  When: <condition>
  1. <action>

  **Fallback:** <fallback>

  ── FOR-EACH STEP ───────────────────────────────────────────────────────────

  ### 4. <Name>

  **Over:** <collection>
  **As:** `<item_variable>`

  1. <action using `{item}`.>
  2. <action.>

  ── REPEAT-UNTIL STEP ──────────────────────────────────────────────────────

  ### 4. <Name>

  1. <action.>
  2. <action.>

  **Until:** <exit condition>

  ── VERIFY (recommended last step) ──────────────────────────────────────────

  ### 5. Verify

  - [ ] <expected output exists and is non-empty>
  - [ ] <output shape matches the contract>
  - [ ] <no unresolved errors in state>
  - [ ] <domain-specific check>
-->
