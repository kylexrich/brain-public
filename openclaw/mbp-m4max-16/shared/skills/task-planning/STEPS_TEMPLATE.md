# steps-1-5.md

```md
# [Title] - Steps 1-5

## Step 1 - [Step name]

### Metadata
**Status:** [Incomplete | In progress | Blocked | Complete]
**Prereqs:** [Step numbers that must complete first, or `None` if independent]
**Size:** small | medium
**Execution root:** [absolute path or precise working root]
**File / work-area scope:** [files, folders, systems, docs, or surfaces this step may touch]
**Execution mode:** [Serial | Parallel-ready]
**Owner / session:** [agent handle or session key]
**Completed At:** YYYY-MM-DD
**Completion Notes:**
- [Notes]

### Context

**Objective:** [What this step accomplishes in the overall plan]
**Done When:**
- [Verifiable criterion]
- [Verifiable criterion]

**References:**
- [Context section X]
- [Links or file paths]
- [Code references]

### Plan
- [Action 1 — what you will do + where]
    - Snippet:
      ```
      // minimal illustrative snippet or command when useful
      ```
- [Action 2 — what you will do + where]
    - Snippet:
      ```
      // minimal illustrative snippet
      ```
- [Action N — what you will do + where]

### Step checklist
- [ ] Step-specific tasks complete
- [ ] Validation for this step ran (tests, linting, manual checks, docs checks, or operational checks as appropriate)
- [ ] Issues found by validation were fixed or explicitly recorded as blockers
- [ ] "Done When" criteria are satisfied
- [ ] File / work-area scope matches the actual work performed
- [ ] Step metadata updated in the steps doc and the steps guide index
- [ ] If executing within `step-loop`, return control to the orchestrator with a concise summary, leave changes unstaged, and do not ask for next action

---

## Step 2 - [Step name]

[Repeat structure]

---

## Step N - Final Validation & Cleanup

### Metadata
**Status:** [Incomplete | In progress | Blocked | Complete]
**Prereqs:** [All prior steps]
**Size:** small | medium
**Execution root:** [absolute path or precise working root]
**File / work-area scope:** [entire task scope]
**Execution mode:** Serial
**Owner / session:** [agent handle or session key]
**Completed At:** YYYY-MM-DD
**Completion Notes:**
- [Notes]

### Context

**Objective:** Verify end-to-end correctness of all changes produced by this task.
**Done When:**
- All prior steps are marked complete
- All required validation passes for this task
- No obvious regressions or unfinished task artifacts remain
- Documentation is updated if required

### Final Step Checklist
- [ ] Confirm all prior steps are complete
- [ ] Review and resolve any outstanding TODOs introduced during this task
- [ ] Run the task's full validation set (tests, linting, type checking, build, manual checks, docs review, or operational verification as applicable)
- [ ] Issues found by validation were fixed or explicitly recorded as blockers
- [ ] Verify end-to-end correctness for the feature, workflow, or change
- [ ] Confirm all implementation changes remain unstaged unless the user explicitly requested otherwise
- [ ] Update task metadata in the steps docs and the steps guide index
- [ ] Move the task folder to `shared/docs/tasks/completed/<slug>-YYYY-MM-DD/` (step-loop handles this automatically)
- [ ] If executing within `step-loop`, return control to the orchestrator with a concise summary, leave changes unstaged, and do not ask for next action
- [ ] Prepare a completion summary with validation status, residual risks, and recommended next actions

```
