---
name: infra-review
description: "Infrastructure review focused on CDK correctness, AWS best practices, and documentation compliance. Validates that infrastructure changes are stable, secure, and properly implemented. Includes end-to-end validation when changes span app/client/common."
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, WebFetch, WebSearch, mcp__aws-cdk-mcp__*, mcp__aws-knowledge-mcp-server__*
---

# Infrastructure Review Skill

Deep validation of infrastructure changes against current best practices, official documentation, and implementation correctness.

## When to Use

This skill activates for:

- "review infrastructure" or "review infra"
- "review CDK changes" or any IaC tool changes
- Infrastructure-focused reviews where correctness and best practices are the priority
- Infrastructure changes that may affect app/client stability

For non-infrastructure reviews:

- Backend logic only → use `$backend-review` (`/backend-review`)
- Frontend logic only → use `$frontend-review` (`/frontend-review`)
- General end-to-end flow → use `$e2e-review` (`/e2e-review`)

---

## Scope Determination

**Two scope modes:**

| User mentions...                                   | Scope               |
|----------------------------------------------------|---------------------|
| "uncommitted", "staged", "unstaged", "my changes"  | Uncommitted Changes |
| Specific infrastructure, feature, or flow          | Specific Focus Area |

If neither is mentioned, default to **Uncommitted Changes**.

---

## Core Objective

**Validate that infrastructure is correct, stable, and follows current best practices.**

This means verifying:

1. **Implementation correctness** — Code aligns with official documentation for the tools/platforms in use
2. **Current best practices** — Security, reliability, cost, and operational patterns reflect 2025/2026 standards
3. **Documentation compliance** — Implementation matches official docs for all dependencies and platforms
4. **Service stability** — Changes won't break deployed services or cause downtime
5. **End-to-end alignment** — When app/client/common changes exist, they integrate correctly with infrastructure

Primary focus is **correctness and stability**, not AGENTS.md rule compliance (though relevant AGENTS.md rules like `cdk/AGENTS.md` still apply to their respective code).

---

## Infrastructure Scope

**This skill is not limited to AWS or CDK.** Infrastructure can take many forms:

- **IaC tools:** AWS CDK, Terraform, Pulumi, CloudFormation, Ansible, etc.
- **Cloud platforms:** AWS, GCP, Azure, Vercel, Cloudflare, etc.
- **Container orchestration:** Docker, Kubernetes, ECS, etc.
- **CI/CD pipelines:** GitHub Actions, GitLab CI, etc.
- **Any other infrastructure-related code**

The examples in this document use AWS CDK because that's the primary IaC tool in this repo, but adapt the validation approach to whatever infrastructure technology is actually in scope.

---

## Packages in Scope

| Package    | When to Review                                                        |
|------------|-----------------------------------------------------------------------|
| `cdk/`     | When CDK/infrastructure code changes                                  |
| `app/`     | When infrastructure changes affect backend (env vars, permissions, etc.) |
| `client/`  | When infrastructure changes affect frontend (CDN, env vars, etc.)     |
| `common/`  | When infrastructure changes affect API contracts                      |

---

## Workflow

### Phase 1: Gather Scope

**For Uncommitted Changes:**

```bash
git status
git diff --staged
git diff
```

Identify which packages have changes. Note infrastructure changes and any related changes in other packages.

**For Specific Focus Area:**

Identify the relevant infrastructure files/flows based on what the user asked about.

---

### Phase 2: Implementation Correctness Validation

For each infrastructure change in scope:

1. **Read the changed code** — Understand what's being modified
2. **Verify API/construct usage** — Check that APIs, constructs, and patterns are used correctly per official docs
3. **Validate configuration** — Ensure all required config is set and values are appropriate
4. **Check relationships** — Verify dependencies, references, and cross-component interactions

---

### Phase 3: Research Best Practices and Documentation

Validate infrastructure against current best practices and official documentation. Use the appropriate tools based on what's in scope:

**Web searches (WebSearch, WebFetch):**

- Search for current best practices (e.g., "[technology] best practices 2025")
- Fetch official documentation pages for specific APIs or constructs
- Check for deprecations or breaking changes when patterns seem outdated
- Useful for any infrastructure technology

**AWS MCP tools (when AWS is in scope):**

- `mcp__aws-knowledge-mcp-server__aws___search_documentation` for AWS service docs
- `mcp__aws-cdk-mcp__CDKGeneralGuidance` for CDK guidance
- `mcp__aws-cdk-mcp__ExplainCDKNagRule` for security rule explanations

**Example searches:**

- "AWS CDK v2 best practices 2025"
- "Terraform AWS provider security best practices"
- "Docker multi-stage build best practices"
- "[specific construct or resource] recommended configuration"

Use whichever combination of tools is appropriate for the infrastructure being reviewed.

---

### Phase 4: Best Practices Validation

Validate against industry-standard pillars (adapt to the platform in use):

1. **Security**
   - Permissions follow least privilege
   - Secrets are properly managed (not hardcoded)
   - Encryption configured appropriately
   - Network access is properly scoped

2. **Reliability**
   - Appropriate fault tolerance
   - Health checks configured correctly
   - Scaling matches expected patterns
   - Zero-downtime deployment where appropriate

3. **Cost Optimization**
   - Resources appropriately sized for environment
   - No over-provisioning
   - Cost-effective alternatives considered

4. **Operational Excellence**
   - Logging and monitoring configured
   - Alerts set up for critical metrics
   - Deployment supports observability

---

### Phase 5: End-to-End Integration Validation

When changes span multiple packages:

1. **Environment variables** — Infrastructure-defined env vars match what app/client expect
2. **Permissions** — App has required permissions for all services it accesses
3. **Resource references** — Endpoints, ARNs, URLs, and names are correctly passed
4. **API contracts** — Any API infrastructure changes align with common/OpenAPI spec
5. **Client configuration** — CDN, CORS, and frontend config align with client needs

**Key questions:**

- Does the app code expect env vars/resources that infrastructure provides?
- Are permissions sufficient for what the app does?
- Do API routes match the OpenAPI spec?
- Will the client be able to reach the backend with current config?

---

### Phase 6: Fix Critical Issues

If you find infrastructure that is:

- **Incorrect** — APIs/constructs used wrong, missing required config, broken references
- **Insecure** — Violates security best practices or relevant AGENTS.md rules
- **Unstable** — Would cause downtime, data loss, or service disruption
- **Outdated** — Uses deprecated patterns when better alternatives exist

Fix it immediately. Document what was changed and why.

For issues that are **suboptimal but not critical** (e.g., could be more cost-effective, minor naming inconsistencies), report them but don't necessarily fix unless requested.

---

### Phase 7: Verify

After all changes, follow the `$ci` (`/ci`) skill.

---

## Output

When complete, summarize:

1. **Infrastructure validated** — What infrastructure code was reviewed
2. **Best practices checked** — Which best practices were validated
3. **Documentation consulted** — Key docs/sources used for validation (include URLs from web searches)
4. **Issues found and fixed** — Critical problems resolved
5. **Recommendations** — Non-critical improvements for future consideration
6. **End-to-end status** — If app/client/common were in scope, their integration status

---

## Quality Checklist

- [ ] All infrastructure changes in scope were reviewed for correctness
- [ ] Best practices and documentation were consulted for non-trivial constructs/APIs
- [ ] Best practices validated (security, reliability, cost, ops)
- [ ] End-to-end integration was validated when multiple packages changed
- [ ] Critical issues were fixed; non-critical issues were documented
- [ ] CI passes after changes
