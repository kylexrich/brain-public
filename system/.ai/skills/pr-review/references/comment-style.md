# Comment Style

How to write the **Comment** text — the only part that gets posted. The goal is
one short question a sharp, busy senior engineer would naturally ask.

## Rules

- **Exactly one concise question.** Use one sentence, end with `?`, and omit
  every explanation that can live in the separate **Explanation** field.
- **Ask for the needed change, not for comprehension.** Prefer "Could we
  handle…?" or "Should this use…?" over "Why did you…?" or "Is this
  intentional?"
- **Use the code's own vocabulary.** Name the actual identifiers, functions,
  and files involved — comments lexically anchored to the changed code are
  measurably more likely to be acted on.
- **Keep the question concrete.** Name the guard, operation, or fix the code
  needs. Do not use the question form to soften an unverified suspicion.
- **Point at prior art when it exists.** "like `incrementViews` does" or
  "like the guard in `loadFlags`" can keep a fix request specific without
  adding an explanation.
- **Tone:** neutral and direct. "this"/"we" or no subject — never "you". No
  "simply", "just", "obviously", severity label, or `nit:` prefix.
- **No formatting theater.** No headers, bullets, tables, emoji, checkmarks,
  bold, suggestion blocks, or em dashes inside the posted question.

## Explanation

Add **Explanation** after **Comment** only when the question alone would leave
the user unable to judge the finding. Keep it to 1–3 concise factual sentences
covering the trigger and impact. Explanation is chat-only context and is never
posted to GitHub.

## Acid test

Before finalizing each draft: *would a senior colleague ask exactly this
question, at this length, in this tone?* If not, edit or cut.

## Before / after

| Bad (AI-style) | Good (human-style) |
|---|---|
| "⚠️ **Potential Issue (Medium severity):** The function `processItems` may not handle all edge cases. Consider adding validation for empty arrays, null inputs, and undefined values to ensure robustness. 🛡️" | "Could `processItems` handle an empty `items` array before calling `reduce`?" |
| "It might be worth considering whether this timeout should be made configurable for flexibility across deployment environments." | *(silence — hypothetical, no trigger)* |
| "Great work! 🎉 One small suggestion: `data` could be more descriptive, e.g. `userProfileData`, to improve readability and maintainability." | *(silence — naming preference, no convention violated)* |
| "This introduces a potential race condition. In concurrent scenarios, unsynchronized access to shared state can lead to unpredictable behavior and data corruption. Best practice is proper locking." | "Could this update happen inside the transaction, like `incrementViews`, so concurrent increments are not lost?" |
| "**Security Consideration:** While input may be sanitized elsewhere, parameterized queries are recommended as defense-in-depth against SQL injection." | "Could `search` be parameterized before `buildFilter` adds it to the query?" |
| "Consider adding error handling here. If the API call fails, the promise rejection is unhandled, which could cause issues." | "Could this catch `fetchConfig` failures and use the cached value, like `loadFlags`?" |

## Anti-patterns (each is testable — violate one, rewrite the comment)

1. **Nit flood** — would a linter rule cover it? Then it's banned.
2. **Unreachable hypothetical** — the Concern must name a concrete trigger via
   an actual caller, or the comment is dropped.
3. **Diff-in-isolation** — no comment ships unless the Concern records what
   was checked outside the diff.
4. **Manufactured output** — zero comments is an allowed, stated outcome;
   never invent findings to look thorough.
5. **Not one question** — multiple sentences, an assertion before the question,
   or a missing final `?` must be rewritten.
6. **Explanation inside Comment** — move rationale into **Explanation** and
   leave only the concise requested change in the posted question.
7. **Question-shaped hedging** — "might/could potentially" and comprehension
   questions do not rescue weak evidence; verify the defect or drop it.
8. **Duplicate feedback** — anything present in existing threads (open or
   resolved) is off-limits.
9. **Convention-fighting** — a pattern the repo uses intentionally elsewhere
   is not a finding.
10. **Scope creep** — no comments on lines the PR doesn't touch or logically
    affect; no "while you're at it."
