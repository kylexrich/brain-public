---
title: "CDK Infrastructure Rules"
description: "CDK testing policy, AWS region handling, human-only deployments, secrets, stack organization, configuration, logical IDs, stack names, cost, deploy health, and cell scaling."
order: 1
---

## **[STRICT] Testing Policy**

* Do not add or keep automated tests of any kind in `cdk/`: unit, integration, snapshot, construct, synthesized-template, or deployment tests.
* Do not add test runners, test configs, test scripts, fixtures, mocks, or scaffolding in `cdk/`.
* Validate `cdk/` changes through type-checking, build, and the repo `$ci` (`/ci`) skill.

## **[STRICT] AWS Region and Deployment Restrictions**

All non-certificate infrastructure deploys to **`ca-central-1`** (Canada - Central).

**Exception:** `cdk/lib/stacks/cloudfront-certificate-stack.ts` deploys to `us-east-1` because **CloudFront requires its TLS certificate to be in `us-east-1`**. This is an AWS requirement, not a project choice.

| Stack | Region | Reason |
|-------|--------|--------|
| `CloudFrontCertificateStack` | `us-east-1` | CloudFront TLS certificate (AWS requirement) |
| All other stacks | `ca-central-1` | Primary deployment region |

The region is set in `cdk/lib/app.ts`:
- `CloudFrontCertificateStack`: hardcoded to `us-east-1`.
- `CellStage` and all other stacks: use `process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION`.

- **[STRICT]** AI agents must never run deployment commands, including `npm run deploy:beta`, `npm run deploy:prod`, `cdk deploy`, or any other command that deploys infrastructure.
- **[STRICT]** Human operators run deployments. Human deployment commands for non-certificate stacks must target `ca-central-1`; CloudFront certificate operations target `us-east-1`.
- **[STRICT]** When debugging or querying AWS resources, always use `--region ca-central-1` unless specifically working with CloudFront certificates.

## **[STRICT] Secrets Management**

* All sensitive secrets (API keys, database credentials, tokens, etc.) must be stored in AWS Secrets Manager or AWS Systems Manager Parameter Store (SecureString).
* Secrets are injected into ECS task definitions or runtime secret mechanisms. Never bake secrets into images, environment files, or CDK code.

## **[GUIDELINE] Stack Organization**

* Model infrastructure as reusable constructs; keep stacks focused on deployment boundaries (account/region/cell) and composition only.
* Favor multiple small stacks over a single monolith when lifecycles, blast radius, or permissions differ; share outputs via explicit references or exports.
* Keep each stack's responsibilities clear and narrowly scoped to reduce updates that replace unrelated resources.

## **[GUIDELINE] Configuration-Driven CDK**

* Pass environment-specific values through typed props and `cdk/lib/config/`; avoid hard-coded values in constructs.
* Keep lookups (context, `fromLookup`, env vars) at the app/stack boundary, then pass resolved values into constructs to keep them deterministic and testable.
* If configuration is reused across constructs, centralize it under `cdk/lib/config/index.ts`, `cdk/lib/config/util.ts`, `cdk/lib/config/beta-config.ts`, or `cdk/lib/config/prod-config.ts` instead of duplicating constants.

## **[GUIDELINE] Construct IDs & Logical ID Stability**

* Construct IDs must be unique within their parent scope and remain stable over time; avoid renaming IDs for stateful resources to prevent logical ID churn.
* Use explicit, intention-revealing IDs (e.g., `Database`, `AppLoadBalancer`, `WebServerAsg`) rather than generic names.
* When refactoring, preserve the existing construct path for resources that must keep the same CloudFormation logical ID.

## **[GUIDELINE] Stack Naming Standards**

* Stack names must be deterministic, start with a letter, and contain only letters, numbers, and hyphens (max 128 chars).
* Default stack naming convention: `${cellName}-emly` as defined in `cdk/lib/app.ts`.
* Only override the default when a stack is intentionally split for lifecycle or permission reasons; keep the prefix `${cellName}-` to preserve uniqueness by cell.

## **[GUIDELINE] Environment Configuration**

* Supply environment configuration via context (`cdk/cdk.json`, `cdk/cdk.context.json`, or `--context` flags); avoid hard-coded values in code.
* Define per-cell deployment settings under `cdk/lib/config/`; do not use `.env` files or `dotenv` in the CDK app.
* Human operators should run the root-level `deploy:beta` or `deploy:prod` scripts when deploying from the monorepo so shared build steps execute consistently.
* Version infrastructure changes alongside application updates to keep environments reproducible.

## **[GUIDELINE] Cost and Access Controls**

* For `isProd=false` cells, prefer the lowest-cost feasible instance sizes and relax access controls only for the explicitly documented exception that makes the beta database publicly accessible.

## **[GUIDELINE] Zero-Downtime Deploys**

* Maintain zero-downtime deploys by using ECS rolling deploy configuration with `minHealthyPercent: 100` and `maxHealthyPercent: 200`, plus ALB health checks with 10-second intervals, 5-second timeout, 2 healthy thresholds, and 3 unhealthy thresholds unless an environment explicitly opts out.

## **[GUIDELINE] Cell-Based Scaling**

* Define all scaling counts and utilization targets inside `cdk/lib/config/` (`EcsScalingConfig`) so the same values drive every Fargate service via `cdk/lib/constructs/ecs-application.ts`; do not duplicate scaling numbers directly inside stacks.
* Apart from the `isProd=false` exception that makes the beta database publicly accessible, keep the remainder of each cell's infrastructure identical; only scaling settings (task counts, autoscaling bounds, CPU targets) should differ per cell.
* Treat cell domains, certificates, origin headers, observability, alarms, and secrets as configuration values for otherwise identical infrastructure. Any non-scaling variation beyond the explicit `isProd=false` publicly accessible beta database exception must be documented and justified before merging.
