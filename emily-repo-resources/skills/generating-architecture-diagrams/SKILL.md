---
name: generating-architecture-diagrams
description: Generate or update two architecture documents — a runtime-topology flowchart and a tech-stack inventory — as standalone HTML at `docs/reference/runtime-topology.html` and `docs/reference/tech-stack.html`. Use when the user asks to create, regenerate, refresh, update, or audit the architecture diagram(s), system topology, tech-stack inventory, or any "architecture.html"-style document. Grounds every element in IaC, manifests, and source imports; verifies every logo URL before embedding.
---

# Generating Architecture Diagrams

## Outputs

Two files:

- `docs/reference/runtime-topology.html` — a Mermaid **flowchart** showing how the system's live components connect at runtime (compute, data, async, edge, security, observability, third-party). Every node carries a real brand/service logo.
- `docs/reference/tech-stack.html` — a tiled inventory of primary packages, runtimes, and third-party dependencies grouped by layer. Every tile carries a real brand logo. No connections.

Topology = how things connect. Tech stack = what things exist. Do not merge them.

## When to use

Triggers: "generate/update/refresh/regenerate/audit the architecture diagram(s)"; "system topology"; "tech stack diagram"; "architecture.html"; "rebuild the docs/reference HTMLs". Also run proactively after large IaC or dependency-topology changes if the user confirms.

## Non-negotiable rules

1. **Ground every element in the repo.** Never list a service, integration, queue, task def, or dependency unless it is attested by IaC, a manifest, or an actual `import`/`require`/`#include` in source. No inference from names. No package-installed-but-unused items.
2. **Verify every logo URL with a live HEAD request before embedding.** Check HTTP 200 **and** content-type is an image. Never embed an unverified URL. A broken image in the rendered output means the task is not done.
3. **Use Mermaid `flowchart` with HTML labels + `<img>` tags.** Do not use `architecture-beta` (no arbitrary `<img>`) or `C4Context` (experimental, no HTML). Set `securityLevel: 'loose'` and `flowchart: { htmlLabels: true }`.
4. **Subnet types, task boundaries, and edge directions must match IaC, not intuition.** Public vs private-isolated vs private-with-egress matters. Shared task definitions vs separate services matters. Inbound-webhook vs outbound-SDK matters. If you can't tell, read more code — do not guess.
5. **Run the parallel validation pass before declaring done.** Six validator subagents, one per section (compute, data, async, edge, third-party, security/observability). Apply their corrections. See `references/validators.md`.
6. **No emojis in prose, no "TODO" nodes.** If a real logo cannot be resolved after the full fallback ladder, use a monochrome text badge (see `references/logos.md` §Fallback).

## Workflow

Follow phases in order. Do not skip. Each phase has a concrete exit criterion.

### Phase 1 — Discover the project

Work from outside in:

- **Build / package manifests** — `package.json`, `pyproject.toml`/`requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`/`build.gradle*`, `*.csproj`, `Podfile`/`Package.swift`, `CMakeLists.txt`, `vcpkg.json`, `mix.exs`, `Gemfile`. Identify runtime languages, frameworks, ORMs, HTTP clients, test frameworks.
- **Workspace / monorepo markers** — top-level `package.json` with `workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, Bazel `WORKSPACE`, Nx/Turbo caches. Enumerate primary packages; each gets its own layer group.
- **Infrastructure as Code (IaC)** — `cdk/`, `infrastructure/`, `terraform/` (`*.tf`), `pulumi/` (`Pulumi.yaml`), `serverless.yml`, `sst.config.*`, `k8s/` or `*.yaml` under `manifests/`, `Dockerfile*`, `docker-compose*.yml`, `fly.toml`, `app.json`, `vercel.json`, `render.yaml`, `.github/workflows/*.yml`. IaC is the source of truth for topology — compute units, subnets, queues, secrets, routing.
- **Entry points** — `main.*`, `index.*`, `src/app.*`, `cmd/*`, `bin/*`, Handler files. Scan for how the process is structured (HTTP server vs worker vs CLI vs scheduled task) and what env vars gate role selection (e.g., `SERVICE_ROLE`, `APP_MODE`).
- **Source-level integration usage** — grep the source tree (exclude `node_modules/`, `dist/`, `build/`, `.venv/`, `target/`, vendored deps) for actual `import`/`require`/`use`/`include` statements naming each third-party package in the manifests. A package in the manifest that is never imported in code does **not** belong on either diagram.
- **Database schemas / migrations** — Prisma schema, SQLAlchemy models, `*.sql` in `migrations/`, Alembic, Ecto, Flyway, Liquibase. Confirms which data stores are real.
- **Queue / event bindings** — source files matching `SQS|Kafka|RabbitMQ|NATS|Pub/?Sub|EventBridge|Kinesis|Celery|BullMQ|Sidekiq|Resque`.
- **Secrets / KMS** — IaC for Secrets Manager, Vault, SOPS, SSM Parameter Store, doppler, 1Password Connect; KMS / GCP KMS / Azure Key Vault.

Exit criterion: you can name every top-level deployable unit, every datastore, every queue, every inbound ingress path, and every confirmed third-party integration, each with a file:line citation.

### Phase 2 — Categorize into the canonical slots

Force everything discovered in Phase 1 into these slots. Omit a slot if no evidence supports it. Do not invent new slots casually.

**Runtime-topology slots** (for `runtime-topology.html`):

| Slot | Typical contents |
| --- | --- |
| Client | End-user browser / mobile app / CLI that initiates requests |
| Edge / DNS | DNS, CDN, certificate manager, load balancer, API gateway, WAF |
| Compute | Servers / functions / workers / cron jobs. Group by task definition / deployment unit, not by process type alone |
| Data plane | Primary DB, cache, search index, blob storage. Show the subnet/isolation boundary when IaC expresses one |
| Async / events | Queues, topics, streams, schedulers, event buses |
| Security | Secrets store, KMS keys, IAM roles (if meaningful at this zoom) |
| Observability | Log sink, metrics, tracing, alarms → notification fanout |
| Third-party | External SaaS APIs the app calls, grouped separately from inbound-webhook sources |

**Tech-stack slots** (for `tech-stack.html`) — one section per meaningful layer in the project. Common set: Client, API/Server, Shared contract (if present), AI/ML, Integrations, Data, Infra, Tooling. Adjust to the project; e.g., an iOS app may have SwiftUI, Combine, CoreData, Firebase, Sentry, Fastlane.

### Phase 3 — Resolve logos (critical; do not shortcut)

Logo resolution is the single most failure-prone step. Follow `references/logos.md` exactly. Summary:

1. Build a **logo request list** — every node and every tile needs one row: `(display_name, category, candidate_slugs[])`.
2. Run the **resolution ladder** (Iconify first, because it aggregates both simple-icons and gilbarbara/logos including trademark-removed brands). See `references/logos.md` §Ladder.
3. **Verify each resolved URL with the script** `scripts/verify-logos.sh` (or equivalent inline). A URL is valid only if HTTP 200 **and** `content-type: image/svg+xml` (or `image/png`, `image/webp`). A 200 with `text/html` is a 404 in disguise.
4. Record the resolved URL for each name in a local `logo-map.json` scratchpad for this run. Do not re-resolve during generation.
5. For names that fail every CDN, fall back to a monochrome text badge (see template). Do not ship a broken `<img>`.

**You must run the verification before writing either HTML file.** Treat unverified URLs as missing.

### Phase 4 — Generate the HTML files

Start from the templates in `references/`:

- `references/runtime-topology-template.html`
- `references/tech-stack-template.html`

Substitute only:
- Project-derived nodes, tiles, edges, subgraphs, and labels.
- Resolved logo URLs from Phase 3.
- Domain-appropriate wording in the subtitle and legend.

Keep unchanged:
- The Mermaid initialization block (`securityLevel: 'loose'`, `htmlLabels: true`, `theme: 'base'`, theme variables).
- The CSS variables and dark-theme tokens.
- The legend structure (color swatches + solid/dashed edge key).
- The class definitions (`classDef client|edge|compute|data|queue|sec|ext`).

**Mermaid rules the template enforces:**
- Flowchart direction `LR` at top level; override with `direction TB` inside a subgraph only when the contained nodes form a vertical tier.
- Max 3 levels of subgraph nesting. If you need more, the categorization is wrong — reorganize.
- Solid arrow `-->` = runtime request/data flow. Dashed `-.->` = config, secret read, certificate binding, webhook ingestion. Thick `==>` is reserved; avoid unless one hot path genuinely dominates.
- Every node label is quoted. Every `<img>` has a fixed `height` attribute (not CSS) to avoid Mermaid mismeasuring the node before CSS applies.
- Subgraph titles may contain `<img>` tags when `htmlLabels: true`; use this for the top-level header of each compute/task group.
- Use `classDef` for color; never per-node `style` except to stylize subgraphs.

**Tech-stack rules:**
- Tiles are a pure CSS grid, no connections.
- Group sections match the tech-stack slots (Phase 2).
- Each tile: logo image (height 26), bold name, optional 1-line subtitle.
- For the tech-stack page: the runtime is not topology — do not draw arrows, and do not show AWS sub-services individually unless they are a major conceptual dependency (e.g., `CloudFront` is worth listing; `IAM role` is not).

### Phase 5 — Parallel validation

Spawn the six validator subagents in parallel, in a single message. Each gets a self-contained prompt that (a) points at the generated file, (b) lists the claims to check, (c) names the exact source files to inspect, (d) demands `✅ / ❌ / ⚠` with file:line citations. Use `references/validators.md` as the canonical prompt set.

Wait for all six, then aggregate findings into a correction list. **Apply every ❌ and every ⚠ the validators can justify.** For disagreements, re-read the cited file; the code is the tiebreaker.

Exit criterion: re-run the validators (or spot-check) and receive zero ❌ across all six slices.

### Phase 6 — Finalize

- Open both HTML files in a browser mentally (or literally, if the user asks) and confirm every image renders. If any `<img>` produces a broken-image icon on load, your Phase 3 verification was insufficient — fix it.
- Produce a concise summary: what was created/updated, what was corrected during validation, and any items you intentionally omitted with the reason.
- Do not auto-commit.

## Correctness checklist

Read every line before declaring done.

- [ ] Every runtime node and every tech-stack tile has a real, verified logo (or a deliberate text badge with a recorded reason).
- [ ] No package appears that is installed but never imported in source.
- [ ] Subnet labels match IaC exactly (do not call public subnets "private").
- [ ] Shared vs separate compute task definitions are rendered as distinct subgraphs; a shared task def with two services is one dashed subgraph with two service nodes.
- [ ] Sidecars (log/metric agents, service mesh proxies, init containers) are noted on the services that actually carry them, and omitted from services that don't.
- [ ] Inbound webhook providers and outbound SDK callees are distinct nodes even when the vendor is the same (e.g., Stripe webhooks in from the edge; Stripe API called out from the server).
- [ ] Client-side integrations (embeds, analytics beacons, SPA SDKs) originate their edges from the browser/frontend node, not the backend.
- [ ] Edges to secrets stores and KMS are dashed; edges for data and requests are solid.
- [ ] Observability fanout is complete: compute → log sink; alarms → notification topic → downstream handler queue (if one exists).
- [ ] Every region/zone fact stated in a node label matches IaC (e.g., edge certs in a specific region, data plane in another).
- [ ] The legend matches the actually-used edge styles and color classes. Do not keep legend entries for unused classes.
- [ ] Both files load standalone with a single file:// open — no build step, no local assets, no relative images.

## Output summary format

When finishing, report in this shape:

```
runtime-topology.html: <created|updated>
  compute:  <summary of services and task-def grouping>
  data:     <summary>
  async:    <summary>
  edge:     <summary>
  security: <summary>
  third-party: <summary>

tech-stack.html: <created|updated>
  layers: <ordered list>
  tiles:  <count>

corrections applied (from validators):
  - <each correction, 1 line>

intentionally omitted:
  - <item, reason>
```

## Supporting files

- `references/logos.md` — the logo resolution protocol: CDN catalog, verified URL patterns, slug rules per source, known trademark removals, fallback ladder, text-badge template.
- `references/runtime-topology-template.html` — the canonical scaffold for the topology file. Do not modify its structural contract.
- `references/tech-stack-template.html` — the canonical scaffold for the tech-stack file.
- `references/validators.md` — ready-to-send prompts for the six parallel validator subagents.
- `scripts/verify-logos.sh` — deterministic HEAD-based verification that a list of URLs all resolve to real images. Run this after Phase 3.
