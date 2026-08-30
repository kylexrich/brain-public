---
name: storify
description: "ONLY use when the user explicitly asks for story or narrative format, explicitly invokes $storify, or asks to turn a long technical discussion into flowing spoken prose for listening, text-to-speech, or continuing a voice conversation. Do not use for ordinary rewriting, Markdown or formatting changes, prose cleanup, summaries, translations, removing bullets or headers, or requests such as 'no formatting' unless the user also explicitly requests a story or narrative presentation."
---

# Storify

Transform any input into dense, flowing prose at the same level of technical depth — the way a senior engineer would verbally walk another senior engineer through something at a whiteboard. No bullets. No tables. No headers mid-paragraph. No formatting artifacts. Full fidelity.

## Explicit Activation Gate

Apply this transformation only when the user's current request explicitly asks for `$storify`, a story or narrative format, or a listening-oriented spoken rendition of a long technical discussion. A generic request to rewrite, reformat, translate, remove Markdown, convert bullets to prose, or produce plain text does not qualify. If the request does not meet this gate, do not apply this skill; fulfill the request normally in the format the user actually requested.

## The Voice

You are a senior developer explaining something you know deeply to a peer who is equally capable. You don't simplify — you narrate. You assume shared vocabulary, shared context. You use transitions that reflect the actual logical flow ("the reason that matters is...", "which is why...", "the interesting part is...", "this is where it gets subtle..."). You don't hedge or over-qualify. You're precise because you know the material, not because you're listing facts.

## Transformation Rules

**File paths** — never write a raw path. Translate `/some/long/path/to/config.ts` into "the `config.ts` file inside the `path` directory" or "the config file in the `to` folder under `some`" — whatever sounds natural in context. Keep the filename; drop the slash-chain.

**Code blocks** — never render a code block. Instead, describe what the code does in concrete, precise terms. "There's a function that walks the dependency graph depth-first, accumulating seen node IDs in a set to prevent cycles, and returns the flattened list in resolution order." That's the move. You're not vague — you're specific — you just use words instead of syntax.

**Bullets and lists** — weave them into sentences. "It supports three modes" beats a three-item list. If there are many items, group them thematically into a sentence or two. If the list is long enough that prose would get unwieldy, write it as a tight paragraph with clear enumeration in natural language: "first... then... and finally..."

**Tables** — describe the relationships or values in prose. A two-column table of room names and IPs becomes: "The kitchen speaker sits at one address, the bedroom at another, and the bathroom at a third — all reachable by name so you rarely need the IPs directly."

**Headers** — don't use them as section dividers. If the content has multiple major topics, transition between them naturally: "That covers the storage layer — the query side works differently." Headers inside your output signal that you haven't fully committed to the prose form.

**Bold/italic emphasis** — use sparingly if at all. If something deserves emphasis, earn it through sentence structure ("the critical thing here is...") rather than markdown.

## Depth Contract

You do not compress or summarize unless explicitly asked. Every detail in the original has to land somewhere in the prose. If the input had ten nuanced points, the output has ten nuanced points — they're just woven together instead of enumerated. The goal is not shorter. The goal is no formatting.

## Length and Pacing

Match the information density of the original. Long inputs produce long outputs. Use paragraph breaks to signal genuine topic shifts, not for visual spacing. A paragraph can be four sentences or ten — whatever the idea needs.

## Invocation

When this skill is invoked, take whatever content follows (or whatever was most recently discussed) and rewrite it from scratch in this voice. Don't explain what you're doing. Don't add a preamble. Just start the prose.
