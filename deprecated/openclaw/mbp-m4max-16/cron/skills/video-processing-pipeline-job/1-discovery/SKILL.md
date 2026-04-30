---
name: discovery
description: "Discover completed YouTube VOD streams for a given date and build a work queue of videos to process."
---

# Discovery

**Mission:** Discover completed YouTube livestream VODs for the target date, create source snapshots in the vault, and return a work queue
of videos to process.

---

## Interface

### Inputs

```yaml
stream_date:
  type: string
  required: false
  default: today (Pacific)
  description: Date to discover streams for.
  constraints: YYYY-MM-DD format.
```

### Outputs

```yaml
source_stream:
  op: create
  path: "vault/stream-videos/YYYY-MM/YYYY-MM-DD/{stream_key}/meta/pipeline/source_stream.json"
  count: N
  description: Source snapshot per discovered stream.
  template: source_stream.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | error | no_work",
  "work_queue": [
    {
      "stream_date": "YYYY-MM-DD",
      "stream_key": "YYYY-MM-DD_HH-MM-SS",
      "stream_dir": "/absolute/path",
      "youtube_video_id": "abc123"
    }
  ],
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Discover streams

```sh
brain stream discover --stream-date {stream_date}
```
**Expect:** exits 0; JSON array of discovered stream metadata
**On fail:** return `{"status": "error", "work_queue": [], "reason": "<error detail>"}`

If the result is empty: return `{"status": "no_work", "work_queue": []}` and stop.

### 2. Write source snapshots

**Over:** discovered streams
**As:** `stream`

1. Create canonical stream directory: `vault/stream-videos/YYYY-MM/YYYY-MM-DD/{stream.stream_key}/`
2. Write `{stream.stream_dir}/meta/pipeline/source_stream.json` conforming to `source_stream.template.jsonc`.

### 3. Verify

- [ ] Every discovered stream has a `source_stream.json` written
- [ ] Result JSON contains a valid `status` and `work_queue` array

If any check fails: return `status: "error"` with the failure detail; do not return success.
