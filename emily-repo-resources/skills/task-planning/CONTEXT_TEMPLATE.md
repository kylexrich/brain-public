# context.md

```md
# [Descriptive Title]

Date: YYYY-MM-DD
Task slug: <slug>
Status: Draft | Approved

## 0) Summary

- **Objective:** [One sentence]
- **Why now:** [Business or technical motivation]
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

[Business context and why the change matters. Reference docs and product rules.]

---

## 4) Current state and gaps

### Current state
- [What exists today, with file paths]

### Gaps
- [What is missing or insufficient, with file paths]

---

## 5) Changes and considerations

**Significant changes:**
- [Change and why it matters]

**Impact and considerations:**
- [Impacted systems, data, UX, or operations]
- [Operational or rollout considerations]

---

## 6) Constraints, assumptions, dependencies

**Constraints:**
- [Technical, policy, or UX constraints]

**Assumptions:**
- [Assumption]

**Dependencies (ordered):**
- [Dependency or prerequisite]

---

## 7) Requirements

**Functional requirements:**
- [Requirement]

**Non-functional requirements:**
- [Performance, reliability, security, UX]

---

## 8) Proposed approach

- [Architecture or design summary]
- [Key patterns or conventions to follow]

---

## 9) Data model and contracts

### OpenAPI changes
- [Endpoint and schema changes]

### Data model changes
- [Prisma or storage changes]

### Example shapes

{
  "field": "type"
}

---

## 10) Package-level impact

### common/
- [OpenAPI changes, type generation]

### app/
- [Service/controller/validator changes]

### client/
- [UI, state, API client changes]

### cdk/
- [Env vars, permissions, infra changes]

### docs/
- [Docs to update or add]

---

## 11) Edge cases and error handling

- **[Case]:** [Expected behavior]
- **[Case]:** [Expected behavior]

---

## 12) Failure modes and concurrency

**Concurrency/race conditions:**
- [Concurrent access scenario and mitigation approach]

**Idempotency and retries:**
- [Operation that may be retried and how idempotency is ensured]

**Failure modes:**
- [How the system should behave when a dependency or operation fails]

---

## 13) Operational readiness

**Observability:**
- [Logs, metrics]

---

## 14) Research and references

- [External documentation or research links that informed the design]

---

## 15) Open questions

- [Unresolved question that CANNOT be answered through research (See "### [STRICT] Open Questions Filter")]

```
