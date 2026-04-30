# Task Validation Checklist

This checklist is the single source of validation requirements for task planning documents.
Execute each section systematically and document findings.

**Critical rule:** Any confusion, ambiguity, or uncertainty discovered during validation MUST be added to the Open Questions section. Do not proceed with unclear assumptions.

## 1) Document Intake

- [ ] Load the context document
- [ ] Load the steps document
- [ ] Note any additional context or objective changes provided by the user
- [ ] Identify the core objective and success criteria

## 2) Objective Validation

- [ ] Is the objective clearly stated and unambiguous?
- [ ] Does the objective match what the user actually needs (not just what was asked)?
- [ ] Are success criteria verifiable and measurable?
- [ ] Do the acceptance criteria fully capture "done"?
- [ ] If additional context was provided, does the plan account for it?

## 3) Scope Validation

- [ ] Are scope boundaries clearly defined?
- [ ] Are non-goals explicitly stated?
- [ ] Is the scope appropriately sized (not over-engineered, not under-scoped)?
- [ ] Are out-of-scope edge cases reasonable exclusions?

## 4) Technical Accuracy

### Codebase Alignment

- [ ] Verify file paths mentioned actually exist
- [ ] Verify referenced functions/classes/patterns exist
- [ ] Verify referenced dependencies exist in package.json files
- [ ] Verify the described current state matches the actual codebase
- [ ] Verify the proposed approach follows existing patterns and conventions

### API and Data Model

- [ ] Verify OpenAPI changes are compatible with existing schema
- [ ] Verify Prisma changes are valid and migration-safe
- [ ] Verify data model changes account for existing data
- [ ] Verify API contracts are internally consistent

### External Research Validation

- [ ] Web search to verify third-party API assumptions
- [ ] Web search to verify technical approach is current best practice
- [ ] Web search to verify any external service capabilities/limitations
- [ ] Verify security considerations align with industry standards

## 5) Completeness Check

### Context Document

- [ ] All template sections are populated (not placeholders)
- [ ] Background provides sufficient context for execution
- [ ] Constraints and dependencies are fully enumerated
- [ ] Requirements are specific and actionable
- [ ] Edge cases cover likely failure scenarios
- [ ] Error handling approach is defined

### Steps Document

- [ ] All steps needed to achieve the objective are present
- [ ] No critical path is missing
- [ ] Each step has clear "done when" criteria
- [ ] Prerequisites are correctly identified
- [ ] Final validation step is included

## 6) Logical Correctness

### Dependency Order

- [ ] Steps are in correct dependency order
- [ ] No circular dependencies exist
- [ ] Prerequisites can actually be completed before dependent steps
- [ ] Contract changes come before implementations that use them

### Approach Validity

- [ ] The proposed approach will actually solve the problem
- [ ] The approach doesn't introduce unnecessary complexity
- [ ] The approach accounts for all stated requirements
- [ ] The approach handles the stated edge cases
- [ ] The approach is consistent across all packages (common, app, client, cdk)

### Assumption Validation

- [ ] All assumptions are explicitly stated
- [ ] Assumptions are reasonable and likely true
- [ ] Critical assumptions have been verified (not just assumed)

## 7) Risk Assessment

- [ ] Are all significant risks identified?
- [ ] Do mitigations address the identified risks?
- [ ] Is the rollback plan actually executable?
- [ ] Are there hidden risks not mentioned in the documents?
- [ ] Is observability sufficient to detect problems?

## 8) Execution Feasibility

- [ ] Each step can be completed by a single agent in one session
- [ ] Steps are appropriately sized (not too large, not too granular)
- [ ] Information needed for each step is available
- [ ] No step requires information that doesn't exist yet
- [ ] The plan is executable without extensive additional research

## 9) Consistency Check

- [ ] Context and steps documents are internally consistent
- [ ] No contradictions between sections
- [ ] Numbers, names, and references match throughout
- [ ] Package-level impact aligns with the steps

## 10) Missing Details Scan

Ask for each major component:

- [ ] **What could go wrong that isn't addressed?**
- [ ] **What assumption might be false?**
- [ ] **What edge case isn't covered?**
- [ ] **What dependency might be missing?**
- [ ] **What would cause this plan to fail?**

## 11) Open Questions Validation

Any ambiguity or confusion discovered anywhere in this checklist must be captured here.

- [ ] Are all existing open questions still relevant?
- [ ] Are open questions specific enough to be answerable?
- [ ] Add any ambiguity found in objective, scope, or success criteria
- [ ] Add any unverified assumptions discovered during technical validation
- [ ] Add any unclear requirements or edge cases
- [ ] Add any dependency or ordering uncertainties
- [ ] Add any risks that lack clear mitigation
- [ ] Confirm no question can be answered with information already in the documents
- [ ] Confirm no question is actually a decision that should be made now

## 12) Final Assessment

- [ ] Would following this plan actually achieve the stated objective?
- [ ] Are there any blockers to starting execution?
- [ ] What is the confidence level (High/Medium/Low)?
- [ ] What are the top risks to success?
