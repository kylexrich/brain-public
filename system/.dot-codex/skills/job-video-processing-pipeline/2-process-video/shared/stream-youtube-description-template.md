# Stream YouTube Description Template

Defines how the **source-stream** YouTube video description is assembled from generated artifacts. For descriptions of produced clips and composite clips (the AI-cut outputs), see `clip-description-template.md` instead.

**Used by:** stream-chapters (stage 10), stream-summary (stage 11). Each updates its section of `youtube-metadata.json` using this template.

## Template

```
{summary}

---

🎬 About "Building in Public"
I quit Amazon with a near-double salary offer on the table and no startup idea. My grandma thinks I've lost it. Now I'm building EMLY AI and live-streaming the entire journey. Unscripted, full workdays. Coding, AI agent orchestration, openclaw, chess (800 → 1500 by end of 2026), and whatever chaos the day brings. If you're into engineering, chess, or watching someone build a company from scratch in real time, pull up a chair.

🔗 Links
• EMLY AI: https://emlyai.ca/
• LinkedIn: https://www.linkedin.com/in/kylexrich/
• GitHub: https://github.com/kylexrich
• Brain repo (public mirror): https://github.com/kylexrich/brain-public
• Chess.com: https://www.chess.com/member/dreamyduckling

---

⏱️ Chapters
{chapters}

---

📝 Description and chapters were AI-generated from the stream transcript.
```

## Sections

| Section  | Source                              | Format                                                 |
|----------|-------------------------------------|--------------------------------------------------------|
| Summary  | stream-summary stage `output_file`  | Short paragraph describing what happened in the stream |
| About    | This file (static)                  | Update here when bio changes                           |
| Links    | This file (static)                  | Update here when links change                          |
| Chapters | stream-chapters stage `output_file` | Newline-separated `H:MM:SS Title` entries              |
| Footer   | This file (static)                  | AI-generation disclosure                               |

Each stage that updates `youtube-metadata.json` is responsible for its own section only. If a section hasn't been populated yet, it is left
empty.
