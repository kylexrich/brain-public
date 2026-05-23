> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `docs/marketing/events/expcon-2026/AGENTS.md` _(this file)_ > `docs/AGENTS.md` > `AGENTS.md` _(root)_

---

# EXPCON 2026 Collateral Guidance

This directory contains historical EXPCON 2026 marketing collateral variants, drafts, email copy, rendered proofs, and event assets. Treat files under `docs/marketing/events/expcon-2026/` as campaign artifacts, not as authoritative product, pricing, plan-entitlement, or integration documentation.

Current product truth for plan entitlements and integration gates lives in:

- `docs/product/billing.md`
- `docs/product/integration-catalog.md`
- `common/src/util/integration-catalog.ts`

For CRM-sync and integration claims, use those source-of-truth files instead of inferring from old collateral variants.

Do not delete historical collateral variants. When asked to update collateral, correct only the specific active file or clearly final file in scope, and validate any plan or integration claim against the source-of-truth files above.
