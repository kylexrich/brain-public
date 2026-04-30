---
name: marvin-imsg
description: Send an iMessage to Kyle's main number (+16043684730) with text and/or file attachments from kyledvrich@gmail.com. Use when asked to text Kyle, send a message to Kyle's phone, or notify Kyle via iMessage.
user-invocable: true
allowed-tools:
  - mcp__bluebubbles-personal__reply
  - mcp__bluebubbles-personal__send_attachment
---

# /marvin-imsg — Send iMessage to Kyle via BlueBubbles

Send an iMessage to `+16043684730` from `kyledvrich@gmail.com` via BlueBubbles. Supports text messages, file attachments, or both.

## Usage

```bash
# Text only
/marvin-imsg "your message here"

# File only
/marvin-imsg --file /path/to/file.md

# File + text
/marvin-imsg --file /path/to/file.md --text "optional message"
```

## Implementation

**Parse arguments:**
- `--file` followed by a path → read and base64-encode the file
- `--text` followed by text → message caption
- Bare argument → treat as text message

**For text-only messages:** 
Call `mcp__bluebubbles-personal__reply` with `chat_id: any;-;+16043684730` and the text.

**For file attachments:**

For locally-generated files (e.g. images from the $image skill), prefer `file_path` over `buffer` — it avoids base64 size limits:

1. If `--text` was provided, send it first via `mcp__bluebubbles-personal__reply` with `chat_id: any;-;+16043684730`
2. Call `mcp__bluebubbles-personal__send_attachment` with:
   - `chat_id`: `any;-;+16043684730`
   - `filename`: basename of the file
   - `file_path`: absolute path to the file _(preferred for local files)_

If the file is not local (e.g. received as raw bytes), use `buffer` instead:
1. Base64-encode the file using Bash: `base64 -i /path/to/file` (the `-i` flag is required on macOS)
2. Pass the result as `buffer` (base64-encoded file content) instead of `file_path`

At least one of `--file` or `--text` must be provided. Do not ask for confirmation. Just send and report "sent" when done.
