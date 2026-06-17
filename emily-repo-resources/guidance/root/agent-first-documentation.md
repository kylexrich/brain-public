---
title: "Agent-First Documentation"
description: "agent-facing documentation model, authority levels, historical-doc handling, and guidance-map expectations."
order: 1
---

This document records the documentation model used for EMLY AI contributors.

## Principles

- `AGENTS.md` files are maps, not manuals. Keep them short enough that an agent can load the right context quickly.
- AI guidance referenced from `AGENTS.md` belongs under the relevant scoped `.ai/guidance/` directory.
- Scoped `.ai/guidance/` directories are flat. Do not add nested category folders under `.ai/guidance/`.
- Each guidance file under `.ai/guidance/` must define YAML front matter with a non-empty `title`, `order`, and `description`; `scripts/agents-md-footer.js` inlines each guidance file's full content (titled by `title`, sequenced by `order`) into the scoped `AGENTS.md` guidance section.
- The `Guidance (DO NOT EDIT)` section at the bottom of each `AGENTS.md` is generated. Do not hand-edit it; update the guidance file's front matter or content, then run `npm run script:agents:sync`.
- `docs/` is the repository-local knowledge base for product, architecture, SOP, rollout, task, research, marketing, and reference content.
- Use progressive disclosure. A short index should point to category-sized documents; avoid one document per tiny rule and avoid one giant document per package.
- Task plans are checked-in execution artifacts under `docs/tasks/` and are evidence of how work was done, not automatically current product truth.
- Documentation freshness is mechanical work. When implementation and docs disagree, fix the source-of-truth doc or mark the stale document historical.

## Authority Levels

- **Current source of truth:** product behavior, architecture, operations, or package guidance that agents should treat as live.
- **Scoped authority:** a focused `AGENTS.md` or package doc that is still the best place for a narrow rule set.
- **Reference:** durable supporting material, generated architecture output, raw sample data, or provider/vendor notes.
- **Historical:** task plans, completed rollout notes, exported skills, old guidance, and dated implementation plans. Historical docs are preserved but do not override current code or current source-of-truth docs.

## Writing Rules

- Prefer category-sized guidance docs under scoped `.ai/guidance/` directories, not one file per rule.
- Do not duplicate content across docs. Link to the canonical file and keep only the context needed for navigation.
- Use repo-root paths in backticks, with trailing slashes for directories.
- If a document is intentionally stale or archival, say that at the top.
