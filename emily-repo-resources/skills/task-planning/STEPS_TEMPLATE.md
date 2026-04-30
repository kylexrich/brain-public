# steps-1-5.md

```md
# [Title] - Steps 1-5

## Step 1 - [Step name]

### Metadata
**Status:** [Incomplete | In progress | Blocked | Complete]
**Prereqs:** [Step numbers that must complete first, or `None` if independent]
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
- [ ] `$ci` (`/ci`) run
- [ ] Fix any issues caused by `$ci` (`/ci`)
- [ ] Step metadata updated in the steps doc and the steps guide index
- [ ] Ask user for next action (commit, continue, etc.) (**OVERRIDE:** When executing the step within the `$step-loop` (`/step-loop`) skill, do **NOT** ask the user for next action. **ALWAYS** commit the fully completed step. **GOAL**: One commit per step.)

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
* [ ] Run the `$ci` (`/ci`) skill and confirm it passes
- [ ] Fix any issues caused by `$ci` (`/ci`)
* [ ] Update task metadata in the steps docs and the steps guide index
* [ ] Move `.ai/tasks/YYYY-MM-DD/<slug>/` to `.ai/tasks/YYYY-MM-DD/completed/<slug>/`
- [ ] Ask user for next action (commit, continue, etc.) (**OVERRIDE:** When executing the step within the `$step-loop` (`/step-loop`) skill, do **NOT** ask the user for next action. **ALWAYS** commit the fully completed step. **GOAL**: One commit per step.)

```
