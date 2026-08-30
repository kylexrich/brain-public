---
name: define-project
description: Create or refine the concise project document under .context/plans. Use when a project needs its essential product direction, core concepts, design principles, or core contract shapes made clear before or during development. Research relevant design patterns and best practices, then capture fundamental direction plus concrete cross-boundary shapes for material APIs, databases, interfaces, events, configuration, or adapters. Do not produce exhaustive requirements, research reports, or implementation plans.
---

# Define Project

Create or update exactly one `project.md` in the project's `.context/plans/YYYY-MM-DD/<slug>/` directory. Reuse the stable directory when it exists; otherwise create it, including any missing parent directories, using the project's start date and a stable slug.

## Work

1. Read the user's direction and the existing task documents.
2. Research relevant design principles, patterns, and best practices using authoritative sources.
3. Compare their applicability and meaningful tradeoffs against this project, its codebase, and its provider constraints.
4. Distill the few fundamental conclusions the project should preserve.
5. Sketch every material core contract in a compact structural form.
6. State each conclusion and contract once, in the simplest precise language.
7. Remove repetition, speculation, and details that can be learned safely while building.

Product direction, core concepts, design principles, and core contract shapes are useful lenses, not a completeness checklist. Use the smallest structure that makes the project clear.

## Core Contract Shapes

Contracts are producer-consumer shapes, not prose descriptions of behavior. When a material boundary exists, show its compact native form:

- database models or tables with material fields, types, nullability, keys, relationships, cardinality, and enums;
- API operations with request, response, and material error shapes;
- service or provider interfaces with methods, inputs, outputs, and effects; or
- events, queue messages, configuration, prompts, or adapter payloads with their typed shape.

Name the source of truth, producers, consumers, and essential invariants when they clarify the boundary. For existing implementations, use the actual material shape. For proposed work, use the narrowest useful illustrative shape. "Loose" means nonessential details may remain open; it never means replacing shapes with prose rules.

## Boundaries

- Keep it concise, clear, simple, straightforward, and non-duplicative.
- Do not enumerate every feature, behavior, state, edge case, pattern, internal DTO, or implementation choice.
- Do not turn the research into a pattern catalog, literature review, or separate artifact.
- Do not repeat codebase or provider facts; reference their documents when needed.
- Include only contracts shared across a meaningful boundary; leave local function shapes in code.
- Do not add approval states, plans, tasks, commits, pull requests, or rollout instructions.
- When ordinary iterative development can decide something safely, leave it out.

Return the document path and a brief summary of material changes.
