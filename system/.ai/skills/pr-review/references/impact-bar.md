# The Impact Bar

The filter between "candidate issue" and "comment worth a human's attention."
Applied after beyond-the-diff verification (SKILL.md step 5). A candidate that
fails any gate is **dropped** — not softened, not hedged, not turned into a
question.

## The four gates (all must hold)

1. **Exact location citable** — file + line in this PR's diff. "Somewhere in
   the auth layer" is dropped.
2. **Concrete trigger nameable** — a specific input + state that produces a bad
   outcome on a path that is *reachable given the actual callers*. If you
   cannot name the trigger, you are pattern-matching, not reviewing.
3. **No existing guard covers it** — verified (not assumed) that types, caller
   validation, framework defaults, or tests don't already handle the case.
4. **Material failure cost** on at least one axis: correctness, security, data
   integrity/loss, concurrency race, broken API/contract, silent failure on a
   critical path, resource leak, hot-path performance — weighted by blast
   radius and reversibility.

## Include (what authors consistently act on)

- Functional defects and corner-case/validation failures the author didn't
  consider.
- Misused APIs, violated repo conventions, broken contracts or migrations.
- Missing error handling on critical paths (crash, data loss, stuck job).
- Security issues with a nameable attack path.
- Complexity that will genuinely cause bugs — not complexity that offends taste.

## Exclude (never comment, regardless of confidence)

- Anything a linter, formatter, or CI check could flag.
- Style or naming preference where no style guide or repo convention decides
  it. Equally valid alternatives → the author's choice wins.
- Pre-existing issues on lines the PR doesn't touch or logically affect. At
  most one aside, never a demand.
- Hypotheticals with no present-day trigger ("what if this needs to scale",
  "an attacker who already has the key could…").
- Comprehension-only questions and praise-only comments.
- Repeated instances of one root cause — flag once, note "applies to the other
  call sites in this PR."
- Missing error handling in contexts the caller manages; security theater on
  non-security code paths.

## Kill heuristics for borderline candidates

- **Reachability:** can real production input hit this path today? No → drop.
- **Cost of failure:** actual harm, or aesthetic displeasure? A background
  process that fails loudly and retries → let it slide.
- **Reversibility:** rolled back in one deploy vs. corrupted rows or a
  double-charged customer — same probability, different severity.
- **Grade target:** the job is bringing the PR to "definitely improves code
  health," not to perfect. If it clears that bar, remaining points are silence.

## Volume and severity

- Hard cap: **5 comments per review.** More than 5 survivors means a
  design-level problem — one comment at the top saying so beats enumerating
  symptoms.
- Decide severity **after** writing the Concern, from the analyzed failure
  mode — never assign a severity label first and reason backwards.
- Comments carry no severity or `nit:` prefix. If a finding is not worth fixing
  before merge, drop it. No Medium/High/Critical badges.

## Why the bar is this high (evidence)

- ~79% of untuned AI review comments are technically-true nits developers
  ignore; only ~19% get addressed ([Greptile](https://www.greptile.com/blog/make-llms-shut-up)).
- Authors rate useful: functional defects, corner-case failures, API misuse.
  Not useful: comprehension questions, praise, future-work notes
  ([Bosu/Greiler/Bird, MSR 2015](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/bosu2015useful.pdf)).
- Concise, focused comments are ~3x more likely to lead to a code change
  ([Jet Xu, 22k comments across 178 repos](https://jetxu-llm.github.io/posts/low-noise-code-review/)).
- Silence is the correct review outcome roughly a third of the time
  ([GitHub Copilot review data](https://github.blog/ai-and-ml/github-copilot/60-million-copilot-code-reviews-and-counting/)).
- The approval standard is "definitely improves code health," not perfection
  ([Google eng-practices](https://google.github.io/eng-practices/review/reviewer/standard.html)).
