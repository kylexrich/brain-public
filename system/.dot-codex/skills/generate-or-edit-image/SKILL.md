---
name: generate-or-edit-image
description: Generate a new AI image from a text prompt, or edit an existing image with a text instruction. Use when asked to create, generate, draw, illustrate, or edit/modify an image. Uses Gemini API via brain CLI.
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# Image Generation & Editing

Uses `brain image generate` (in `cli/commands/image/generate.ts`) — wraps the Gemini API (`gemini-3-pro-image-preview`) and reads `GEMINI_API_KEY` from env.

## When to Use

- "Generate an image of..."
- "Create a picture of..."
- "Draw me a..."
- "Edit this image, make it..."
- "Change the background / style / lighting in..."

## When NOT to Use

- Video generation or animation — not supported
- Image analysis / description only (no output image needed) — just use the Read tool directly

## Generate (Text → Image)

```bash
brain image generate --name SHORT-SLUG --prompt "PROMPT HERE"
```

## Edit (Image + Text → Image)

```bash
brain image generate --name SHORT-SLUG --prompt "EDIT INSTRUCTION HERE" --source /path/to/source.png
```

## `--name` (required)

Always pass `--name` — a short, filesystem-safe slug describing what the image is (not the full prompt). It becomes the filename in the temp dir: `.ai/tmp/<name>.png`. Invent a stable, meaningful slug before calling the CLI; don't let the tool name things for you.

- Good: `cock-burglar`, `kitchen-daytime`, `hero-shot-v2`
- Bad: `image1`, `output`, `a-rooster-dressed-as-a-classic-cartoon-burglar-noir-lighting`

Name rules: letters, digits, `.`, `-`, `_`; must start with a letter or digit; no `..`.

## Output Path

**Omit `--output` unless a specific destination is requested.** With just `--name`, the CLI writes to `.ai/tmp/<name>.png` — the right place for one-off generations.

Only pass `--output` when there's a clear intended location (e.g. "save it to the vault", "put it on my desktop"); it overrides `--name`-based placement.

## After Running

The command prints the output path. Use the `Read` tool on that path to display the image.

## Sending via iMessage (BlueBubbles)

After generating, use send_attachment with the output path directly — no base64 encoding needed:

```
send_attachment({
  chat_id: "<chat_id from channel tag>",
  filename: "<name>.png",
  file_path: "/Users/kylerich/Developer/brain/.ai/tmp/<name>.png"
})
```
