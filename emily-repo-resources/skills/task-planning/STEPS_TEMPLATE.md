# steps-1-5.md

```md
# [Title] - Steps 1-5

## Step 1 - [Step name]

### Metadata
**Status:** [Incomplete | In progress | Blocked | Complete]
**Prereqs:** [Step numbers that must complete first, or `None` if independent]
**Phase:** [N — include only when the rollout doc gate in `docs/rollout/AGENTS.md` fires; otherwise omit this field]
**Size:** small | medium
**Owner:** [Name or ai handle]
**Completed At:** YYYY-MM-DD
**Completion Notes:**
- [Notes]
- [Notes]

### Context

**Objective:** [Overall Goal]
**Done When:**
- [Verifiable criteria]
- [Verifiable criteria]

**References:**
- [Context section X]
- [Links or file paths]
- [Code references]

### Plan
- [Action 1 — what you will do + where]
    - Snippet:
      ```ts
      // minimal illustrative snippet
      ```
- [Action 2 — what you will do + where]
    - Snippet:
      ```ts
      // minimal illustrative snippet
      ```
- [Action N — what you will do + where]
    - Snippet:
      ```ts
      // minimal illustrative snippet
      ```

### Step checklist
- [ ] Step-specific tasks complete
- [ ] `$backend-review` (`/backend-review`) run
- [ ] `$frontend-review` (`/frontend-review`) run
- [ ] `$e2e-review` (`/e2e-review`) run
- [ ] `$doc-alignment` (`/doc-alignment`) run for affected current markdown, including relevant `AGENTS.md`, `.ai/guidance/`, and source skill references; exclude `docs/tasks/` and `docs/rollout/` unless the active task or rollout artifact itself is in scope
- [ ] `$ci` (`/ci`) run
- [ ] Fix any issues caused by `$ci` (`/ci`)
- [ ] Step metadata updated in the steps doc and the steps guide index
- [ ] Ask user for next action (commit, continue, etc.) (**OVERRIDE:** When executing the step within the `$step-loop` (`/step-loop`) skill, do **NOT** ask the user for next action. **ALWAYS** commit the fully completed step. **GOAL**: One commit per step. **OVERRIDE 2:** When executing the step within the `$phase-loop` (`/phase-loop`) skill, do **NOT** ask the user for next action and do **NOT** commit at the end of this step. `$phase-loop` owns commits and lands exactly one commit at each plan phase boundary. **GOAL**: One commit per plan phase.)

---

## Step 2 - [Step name]

[Repeat structure]

---

## Step N - Final Validation & Cleanup

### Metadata
**Status:** [Incomplete | In progress | Blocked | Complete]
**Prereqs:** [All prior steps]
**Owner:** [Name or handle]
**Completed At:** YYYY-MM-DD
**Completion Notes:**
- [Notes]
- [Notes]

### Final Step Checklist
* [ ] Confirm all prior steps are complete
* [ ] Review and resolve any outstanding TODOs introduced during this task
* [ ] Run the `$e2e-review` (`/e2e-review`) skill with all required context provided
* [ ] Run the `$doc-alignment` (`/doc-alignment`) skill with all required context provided for current source-of-truth markdown, including relevant `AGENTS.md`, `.ai/guidance/`, and source skill references; exclude `docs/tasks/` and `docs/rollout/` unless the active task or rollout artifact itself is in scope
* [ ] Run the `$ci` (`/ci`) skill and confirm it passes
- [ ] Fix any issues caused by `$ci` (`/ci`)
* [ ] Update task metadata in the steps docs and the steps guide index
* [ ] Move `docs/tasks/YYYY-MM-DD/<slug>/` to `docs/tasks/YYYY-MM-DD/completed/<slug>/`
- [ ] Ask user for next action (commit, continue, etc.) (**OVERRIDE:** When executing the step within the `$step-loop` (`/step-loop`) skill, do **NOT** ask the user for next action. **ALWAYS** commit the fully completed step. **GOAL**: One commit per step. **OVERRIDE 2:** When executing the step within the `$phase-loop` (`/phase-loop`) skill, do **NOT** ask the user for next action and do **NOT** commit at the end of this step. `$phase-loop` owns commits and lands exactly one commit at each plan phase boundary. **GOAL**: One commit per plan phase.)

```
