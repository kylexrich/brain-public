> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `client/payload/blocks/AGENTS.md` _(this file)_ > `client/AGENTS.md` > `AGENTS.md` _(root)_

---

# `client/payload/blocks/` EMLY CMS Blocks Guide for AI Contributors

---

# `client/payload/blocks/` Guidance & Rules (DO NOT EDIT. EDIT `client/payload/blocks/.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## Payload Block Sync Rules

### Blog Block Schemas And App AI Pipeline

* `client/payload/blocks/blogBlocks.ts` and `app/src/pipelines/definitions/blog-content-revision/steps/GenerateBlogContentRevisionAIStep.ts` are intentionally duplicated.
* Any edit to block slugs, field names, field requirements, array constraints, enum values, or option sets in `client/payload/blocks/blogBlocks.ts` must be mirrored in `app/src/pipelines/definitions/blog-content-revision/steps/GenerateBlogContentRevisionAIStep.ts` in the same change.
* Do not merge `client/payload/blocks/blogBlocks.ts` changes without matching synchronization updates in the app pipeline file.
