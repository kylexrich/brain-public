> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `docs/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# Docs Working Rules

`docs/` is the repo knowledge base for product, architecture, SOP, rollout, task, research, marketing, and reference content. Active AI guidance and AGENTS rule bodies belong under scoped `.ai/guidance/` directories and are referenced from `AGENTS.md` files.

## Docs Navigation

- Product behavior and business rules: `docs/product/`
- Architecture and topology: `docs/architecture/`
- SOPs and reusable runbooks: `docs/sop/`
- Rollout-doc gate and phased operator evidence: `docs/rollout/`
- Task planning and execution evidence: `docs/tasks/`
- Durable references and raw supporting artifacts: `docs/reference/`
- Research briefs and dated market/product context: `docs/research/`
- Marketing copy, campaign collateral, and examples: `docs/marketing/`
- Voice-agent graph research and prompt/compiler references: `docs/graph-improvement/`

## Related Rules

- Agent-facing documentation model, authority levels, and historical-doc handling:
  `.ai/guidance/agent-first-documentation.md`
- Documentation and skill duplication rule: `.ai/guidance/repository-rules.md#strict-no-documentation-or-skill-duplication`
- Repo path formatting rule: `.ai/guidance/repository-rules.md#strict-file-path-reference-standardization`
- Task artifact authority and layout: `docs/tasks/AGENTS.md`
- Rollout artifact authority and layout: `docs/rollout/AGENTS.md`
