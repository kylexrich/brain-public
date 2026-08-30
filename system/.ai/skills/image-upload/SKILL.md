---
name: image-upload
description: Upload a local PNG through the locally signed-in CleanShot Cloud account and return its share link or optional raw image URL. Use when asked to upload, host, share, or get a CleanShot link for an existing PNG. Do not use for image generation or editing, video, non-PNG files, or image analysis without upload.
---

# Image Upload

Use `brain image upload` as the only implementation. Do not call CleanShot's private API directly or recreate the upload flow in the skill.

## Upload

Run:

```sh
brain image upload /absolute/path/to/image.png
```

The default share record does not expire. Pass `--expires 1d`, `3d`, `7d`, or `30d` only when the user requests expiration. Add `--raw` only when the user requests the direct PNG URL; it is a short-lived signed bearer link that bypasses the share page.

For password protection, use `--password` in an interactive terminal. For non-interactive execution, use `--password-stdin` and write the password to the process's stdin without placing it in the command, environment, logs, or response. Never invent a password.

Use `--json` only when structured output is useful. Otherwise return the single URL printed on stdout. If upload completes but raw-link lookup fails, preserve and return the stable share URL included in the error.
