# Clip Description Template

How YouTube descriptions for produced clips and composite clips MUST be assembled. Used by stage 08 (single clips, no chapters block) and stage 09 (composites, with chapters block). The source-stream description is governed separately by `stream-youtube-description-template.md`.

The placeholders `{source_stream_url}` and (for composites) `{chapters}` are filled in by the upload stages (16 / 17). The suggestion stages produce the description with these placeholders intact.

---

## Single-clip variant (stage 08)

```
<one sentence stating what the clip is, in Kyle's voice>

<optional second sentence with the specific detail — the chess line, the bug, the tool>

📝 This clip was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.

🎥 Watch the full Day {N} stream: {source_stream_url}

—

🔗 Links
• EMLY AI: https://emlyai.ca/
• LinkedIn: https://www.linkedin.com/in/kylexrich/
• GitHub: https://github.com/kylexrich
• Brain repo (public mirror): https://github.com/kylexrich/brain-public
• Chess.com: https://www.chess.com/member/dreamyduckling
```

## Composite variant (stage 09)

```
<one-sentence statement of the binding thesis>

<one optional sentence with the specific detail — the chess line, the incident name, the tool>

⏱️ Chapters
{chapters}

📝 This compilation was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.

🎥 Watch the full Day {N} stream: {source_stream_url}

—

🔗 Links
• EMLY AI: https://emlyai.ca/
• LinkedIn: https://www.linkedin.com/in/kylexrich/
• GitHub: https://github.com/kylexrich
• Brain repo (public mirror): https://github.com/kylexrich/brain-public
• Chess.com: https://www.chess.com/member/dreamyduckling
```

## Chapters block (composites only)

`{chapters}` is filled in by stage 17 (upload-composites) from the composite's segments. Each line is `H:MM:SS {segment_title}` (or `M:SS` if under an hour). The first chapter must start at `0:00` (composite-local timeline, not source-stream timeline). YouTube auto-parses chapters when:

- First chapter starts at `0:00`
- At least 3 chapters
- Each chapter at least 10 seconds long

If any of those rules fail, the upload stage strips the entire `⏱️ Chapters\n{chapters}\n\n` block from the description so YouTube doesn't get confused by a partial chapter set. The suggestion stage doesn't need to know about this — it just produces the description with the placeholder.

## AI-disclosure line (canonical)

- Single clips: `📝 This clip was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.`
- Composites: `📝 This compilation was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.`

These lines are required. Per the channel research, AI-cut clips of own real footage don't require YouTube's `containsSyntheticMedia` flag (it's set to `false` on upload), but the disclosure line is a viewer-trust norm.

## What must NOT appear

- Hashtag spam
- Fake calls-to-action ("smash that like button", "don't forget to subscribe")
- Motivational closers ("and that's why discipline matters")
- Generic clickbait language
