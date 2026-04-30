# AGENTS.md — Shared Docs

This directory is the shared catch-all area for agent-produced files. The name `docs` is historical — it is not limited to markdown.

## Default Destination

- **Put temporary or copied-in files of any type in `tmp/` by default.**
- This includes markdown, images, videos, audio, PDFs, downloads, exports, attachments, and scratch work.
- **When in doubt, dump it in `tmp/`.**
- Use another subfolder only when the user explicitly asks, or when a file clearly belongs in an already-established durable location.
- Never scatter transient files across agent workspace roots, `memory/`, or random directories when `shared/docs/tmp/` will do.

## Other Folders

- Other subfolders may exist for legacy organization, but agents should not feel required to sort routine outputs into them.
- `tmp/` is the default destination unless a more specific instruction overrides it.
