> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `cdk/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `cdk/` Map for AI Contributors

`cdk/` is the AWS CDK v2 infrastructure package. It owns deployable stages, stacks, constructs, cell configuration, and copied custom-resource assets.

## AWS Region and Deployment Rules

`cdk/.ai/guidance/infrastructure-rules.md` is canonical for AWS region handling and human-only deployment restrictions. In short, non-certificate infrastructure belongs in `ca-central-1`, CloudFront certificate resources belong in `us-east-1`, and AI agents must not run deployment commands.

## Directory Layout

- `cdk/lib/app.ts`: CDK entrypoint invoked by `cdk/cdk.json`.
- `cdk/lib/stages/`: stage definitions that group stacks per cell.
- `cdk/lib/stacks/`: stack definitions for network, data, security, certificates, and app layers.
- `cdk/lib/constructs/`: modular constructs for networking, database, ECS application infrastructure, CloudFront, DNS, and support resources.
- `cdk/lib/config/`: environment-specific configuration helpers and per-cell settings.
- `cdk/lib/custom-resources/`: JavaScript handlers for CloudFormation custom resources copied into `cdk/dist/` during builds.
- `cdk/lib/util/`: shared utility modules.
- `cdk/scripts/copy-assets.js`: copies custom resource handlers; runs automatically in the build script.
- `cdk/dist/`: compiled output consumed by the CDK CLI.
- `cdk/.ai/guidance/`: agent-critical CDK and infrastructure rules that are referenced from this map.

## Package Scripts

- `watch`: recompiles TypeScript in watch mode.
- `build`: removes `cdk/dist/`, compiles TypeScript, then copies custom resource handlers into `cdk/dist/lib/custom-resources/`.
- `type-check`: runs TypeScript with `--noEmit`.

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `cdk/.ai/guidance/infrastructure-rules.md`: CDK testing policy, AWS region handling, human-only deployments, secrets, stack organization, configuration, logical IDs, stack names, cost, deploy health, and cell scaling.
