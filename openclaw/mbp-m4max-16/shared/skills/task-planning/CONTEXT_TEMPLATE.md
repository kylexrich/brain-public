# context.md

```md
# [Descriptive Title]

Date: YYYY-MM-DD
Task slug: <slug>
Status: Draft | Approved
Target project/workspace: <repo, folder, system, or workflow>
Execution root / working directory: <absolute path or precise working root for sub-agents>

## 0) Summary

- **Objective:** [One sentence]
- **Why now:** [Business, technical, operational, or organizational motivation]
- **Primary outcomes:** [Short list]

---

## 1) Success criteria

- [Outcome with clear verification]
- [Outcome]

**Acceptance criteria (definition of done):**
- [Specific condition that must be true for the change to be considered complete]

---

## 2) Scope and non-goals

**In scope:**
- [Specific scope item with rationale]

**Out of scope:**
- [Explicit exclusions]

**Out-of-scope edge cases:**
- [Unlikely scenario and brief rationale for exclusion]

---

## 3) Background and motivation

[Business, technical, operational, or editorial context and why the change matters. Reference relevant docs and rules.]

---

## 4) Current state and gaps

### Current state
- [What exists today, with file paths, systems, docs, or process references]

### Gaps
- [What is missing or insufficient, with evidence]

---

## 5) Changes and considerations

**Significant changes:**
- [Change and why it matters]

**Impact and considerations:**
- [Impacted systems, data, UX, docs, or operations]
- [Rollout or sequencing considerations]

---

## 6) Constraints, assumptions, dependencies

**Constraints:**
- [Technical, policy, UX, runtime, or organizational constraints]

**Assumptions:**
- [Assumption]

**Dependencies (ordered):**
- [Dependency or prerequisite]

---

## 7) Requirements

**Functional requirements:**
- [Requirement]

**Non-functional requirements:**
- [Performance, reliability, security, UX, maintainability, docs quality, operational needs]

---

## 8) Proposed approach

- [Architecture, workflow, or design summary]
- [Key patterns or conventions to follow]
- [How parallel-safe execution will be determined when relevant]

---

## 9) Data model and contracts

### API / interface changes
- [Endpoint, CLI command, config contract, or doc contract changes]

### Schema / data model changes
- [Database, config, storage, or structural changes]

### Example shapes

{
  "field": "type"
}

---

## 10) Component-level impact

### [component-name]/
- [Changes to this component]

### [component-name]/
- [Changes to this component]

---

## 11) Edge cases and error handling

- **[Case]:** [Expected behavior]
- **[Case]:** [Expected behavior]

---

## 12) Failure modes and concurrency

**Concurrency / race conditions:**
- [Concurrent access scenario and mitigation approach]

**Idempotency and retries:**
- [Operation that may be retried and how idempotency is ensured]

**Failure modes:**
- [How the system or process should behave when a dependency or operation fails]

---

## 13) Operational readiness

**Observability / auditability:**
- [Logs, metrics, alerts, traceability, or review checkpoints]

---

## 14) Research and references

- [External documentation or research links that informed the design]

---

## 15) Open questions

- [Unresolved question that cannot be answered through research]

```
