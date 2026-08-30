# PR Description Patterns

These are starting points, not fixed templates. Mix and match any sections below to create the smallest, clearest description that answers:

- Why does this PR exist?
- What does it do?

Sections from different examples can stand alone or be combined. Keep each section concise, include it only when it adds distinct information, and avoid repeating the title or another section.

## Compact change

Use for a small, cohesive PR whose purpose is obvious with one short explanation and a few implementation themes.

```markdown
## Summary
<One or two sentences describing the purpose and outcome.>

## Changes
- <One to three concise, high-level bullets.>

Linear: https://linear.app/...
```

## Behavior before and after

Use when the clearest review model is the observable behavior change. Keep **Changes** only when it adds useful implementation scope beyond the behavior comparison.

```markdown
## Behavior Before This PR
- <Relevant previous behavior or limitation.>

## Behavior After This PR
- <New behavior or resolved limitation.>

## Changes
- <One to three concise implementation themes.>

Linear: https://linear.app/...
```

## Problem and solution

Use for a bug, reliability issue, performance problem, or architectural correction where reviewers need the cause and resolution more than a chronological comparison.

```markdown
## Problem
<Concise explanation of the issue and its impact.>

## Solution
<Concise explanation of the chosen resolution.>

## Changes
- <One to three concise implementation themes.>

Linear: https://linear.app/...
```

## Changes only

Use when the title already supplies enough context and additional prose would be redundant.

```markdown
## Changes
- <One to three concise, high-level bullets.>

Linear: https://linear.app/...
```

## Optional additions

Add **Customer Changes** when the PR has meaningful customer-visible impact. Add **Benefits** only for a concrete, non-obvious benefit. Omit either section and the Linear line when they are not relevant.

For an explicit promotion-to-production PR, do not use these sectioned patterns; follow the one-line description rule in `system/.ai/skills/create-pr/SKILL.md`.
