---
name: 04-chunk-transcript
description: "Split a raw transcript JSON into timestamped plain-text chunk files. Not for re-editing or post-processing existing chunk files."
---

# Stage 04 — Chunk Transcript

**Mission:** Split the raw transcript JSON into timestamped plain-text chunk files, one per contiguous time range.

---

## Interface

### Inputs

```yaml
transcript_file:
  type: string
  required: true
  description: Absolute path to the transcript JSON.
  constraints: Must exist and be readable.

output_dir:
  type: string
  required: true
  description: Absolute path to the output chunks directory.
  constraints: Created if absent.

force:
  type: boolean
  required: false
  default: false
  description: Force re-chunking even if output is current.
  constraints: When false, skips if output_dir exists and the transcript's duration_sec matches existing chunks; re-chunks on mismatch. When true, always re-chunks.
```

### Outputs

```yaml
chunks:
  op: create
  path: "{output_dir}/chunk_NNN.txt"
  count: N
  description: Plain-text chunk for a contiguous time range with timestamped lines.
  template: chunk-file.template.txt
```

### Response Format

```jsonc
// Return payload (not written to disk)
// The on-disk artifacts are plain-text chunk files (chunk_NNN.txt), not JSON.
{
  "status": "success | skipped | error",
  "chunks_dir": "/absolute/path/to/meta/outputs/chunks", // matches the output_dir input
  "chunk_count": 7,                                       // number of chunk_NNN.txt files produced
  "transcript_duration_sec": 12345,                       // duration from the source transcript
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Chunk transcript

1. Run the chunk-transcript command. Append `--force` if `force: true`.

```sh
brain stream chunk-transcript --transcript-file {transcript_file} --output-dir {output_dir} [--force]
```

**Expect:** exits 0; result JSON matching the Response Format printed to stdout; `"skipped"` status if output was current and `--force` was
not passed
**On fail:** surface the stderr; return `status: "error"`

### 2. Verify

- [ ] `output_dir` exists and contains at least one `chunk_NNN.txt` file (or status is `skipped`)
- [ ] Result JSON conforms to the Result schema above
- [ ] Result `status` is `"success"` or `"skipped"` (never `"error"`)
- [ ] `chunk_count` is greater than 0
- [ ] `chunks_dir` matches the `output_dir` input

If any check fails: return `status: "error"` with the failure detail; do not return success.
