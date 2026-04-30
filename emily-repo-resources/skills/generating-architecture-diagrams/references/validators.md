# Parallel Validator Prompts

Run these as six independent subagents in a **single message** (parallel fan-out). Each prompt is self-contained; none assume conversation context. All six return pedantic `✅ / ❌ / ⚠` punch lists with file-and-line citations. Apply every ❌ and every justifiable ⚠ before declaring the task done.

Before dispatching, substitute the two placeholders at the top of each prompt:

- `<TOPOLOGY_PATH>` — always `docs/reference/runtime-topology.html`.
- `<REPO_ROOT>` — the absolute path to the target project.

Keep each report ≤250 words. Adjust the "Primary files to read" list per project (see §Tailoring below).

---

## 1 — Compute / runtime

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify every claim it makes about compute (servers, functions, workers, cron jobs, container/task boundaries, sidecars, network placement) against the actual IaC and source. Grounding files are under <REPO_ROOT>.

For each claim:
1. Name the claim (quote the node label or subgraph title).
2. Read the underlying IaC (CDK / Terraform / Pulumi / K8s manifests / Serverless / SST / Dockerfiles / compose) and the entry-point source that gates role selection (e.g., SERVICE_ROLE, APP_MODE branches in main/index files).
3. Report ✅ accurate / ❌ wrong (explain with file:line) / ⚠ ambiguous (explain).

Verify at minimum:
- Count and identity of deployable units.
- Which units share a task/image vs run as their own service.
- Which runtime/framework each one uses (React/Next/Express/FastAPI/etc.).
- Sidecars (log/metric agents, proxies, init containers).
- Network placement (public vs private vs isolated subnets / node pools / namespaces).
- Autoscaling claims if any.

Be pedantic. ≤250 words, file:line citations.
```

## 2 — Data plane

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify every claim about persistent state (relational DB, document DB, cache, search, blob storage, vector DB, graph DB) against IaC and source. Grounding files are under <REPO_ROOT>.

Verify:
1. Every datastore shown actually exists in IaC.
2. Network placement (isolated subnet? public? managed service?).
3. Which ORM/client library each compute unit uses to reach each store.
4. Each drawn edge (compute→store) — is the direction/origin correct? Does any compute unit touch a store the diagram omits? Does the diagram draw an edge that does not exist in code?
5. Any claimed properties (multi-AZ, replicas, encryption at rest) match IaC.

Report ✅ / ❌ / ⚠ with file:line citations. ≤250 words.
```

## 3 — Async / events

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify the async plane (queues, topics, streams, schedulers, event buses, DLQs) against IaC and source.

Verify:
1. Exact inventory of queues/topics/streams vs what IaC creates (including DLQs).
2. Producer edges — which compute units actually enqueue/publish to each, based on source (grep for producers, not just IAM grants).
3. Consumer edges — which compute units consume from each.
4. Scheduler/event-bus fan-out targets.
5. Alarm/notification pipeline (e.g., CloudWatch alarm → SNS → SQS → handler).
6. Any queues that were renamed / removed / added but not reflected on the diagram.

Report ✅ / ❌ / ⚠ with file:line citations. ≤250 words.
```

## 4 — Edge / ingress

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify the edge and ingress path (DNS → CDN → LB/API-gateway → compute) against IaC.

Verify:
1. That the drawn ingress path is the only one — identify any bypass routes (direct LB DNS, regional alternate, preview environments, dev tunnels) and whether they should be shown.
2. Certificate management (region, authority, where it lives in IaC).
3. Listener rules / path routing — do the diagram's edge labels (/api/*, default, etc.) match the routing?
4. HTTP→HTTPS redirect / security headers.
5. Webhook ingress paths — do external provider webhooks traverse the same CDN/LB, or do they hit the origin directly? Are there origin-verify / signature-verify hops worth annotating?
6. Optional/secondary distributions that the diagram may have omitted.

Report ✅ / ❌ / ⚠ with file:line citations. ≤250 words.
```

## 5 — Third-party integrations

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify the third-party integration set.

Verify:
1. For every listed vendor: is it actually integrated (i.e., an import/require/use statement in source), not merely installed in a manifest?
2. For every drawn edge: does it originate from the correct compute unit? (Server-only vendors vs client-side embeds/analytics vs worker-only callers.)
3. Inbound webhook vs outbound API — distinguish clearly. A vendor with both inbound and outbound integration may need two edges.
4. Are there integrations in source that the diagram omits? (Slack, Linear, analytics, error tracking, CRM, calendaring, etc.)
5. Are there installed-but-unused packages that the diagram falsely elevates to an integration?

Report ✅ / ❌ / ⚠ with file:line citations and the correct edge origin when it differs. ≤300 words.
```

## 6 — Security / observability

```
I have an architecture diagram at <TOPOLOGY_PATH>. Verify security and observability claims.

Verify:
1. Secrets store contents — what's actually created in IaC vs what the diagram label claims. Flag missing or extra secrets; note umbrella secrets (multi-key blobs) separately.
2. KMS / key-management — count and purpose of keys.
3. Which compute units actually consume which secrets/keys at runtime — edges should match, not just IAM grants.
4. Log sinks / log groups — does each compute unit the diagram connects to the observability node actually emit logs there?
5. Metric pipelines (EMF, Prometheus, OTel, etc.).
6. Alarm → notification → handler fanout; confirm the topic name and subscription wiring.

Report ✅ / ❌ / ⚠ with file:line citations. ≤250 words.
```

---

## Tailoring

Per-project adjustments to each prompt's "grounding files" (not shown inline above, but add a sentence like `Primary files to read: <list>`):

- **AWS CDK** — `cdk/lib/stacks/*`, `cdk/lib/constructs/*`, `cdk/lib/config/*`.
- **Terraform** — `*.tf` at project root or `terraform/`, plus `modules/`.
- **Pulumi** — `*.ts`/`*.py` under `infra/` with `Pulumi.yaml`.
- **Kubernetes** — `k8s/`, `manifests/`, Helm charts under `charts/`, Kustomize overlays.
- **Serverless / SAM** — `serverless.yml`, `template.yaml`, `samconfig.toml`.
- **Docker / compose** — `Dockerfile*`, `docker-compose*.yml`.
- **Source entry points** — framework-conventional (`src/app.*`, `main.*`, `cmd/*`, etc.) for role branching and integration imports.

Always list the actual files per project. "Look at the code" is never enough.
