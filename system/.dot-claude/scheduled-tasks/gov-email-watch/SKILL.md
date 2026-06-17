---
name: gov-email-watch
description: Daily scan of Kyle's personal Gmail for government-sender emails; text him immediately if any are found.
---

Objective: Check Kyle's PERSONAL Gmail (kylexrich@gmail.com) for any new email that appears to come from a government entity, received in the last 24 hours. If one or more are found, immediately text Kyle about them. If none are found, do nothing (no text).

Steps:

1. Invoke the `gog` skill (read its SKILL.md first). Search the PERSONAL account inbox for recent mail. Always pass the account explicitly via the env var — never hardcode the email address:

   gog gmail search "newer_than:1d in:inbox" --json --results-only \
     --account "$PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS" \
     --select "id,from,subject,date,snippet"

   (If you need exact flag shapes, run `gog gmail search --help` first.)

2. Inspect the `from` field of each returned message and judge whether the SENDER is a government entity. Treat as government any sender whose address or display name indicates a US or Canadian federal/state/provincial agency, for example (non-exhaustive):
   - US: any `.gov` domain, or `dhs.gov`, `cbp.dhs.gov` (e.g. "CBP Information Center <cbpinfocenter@cbp.dhs.gov>"), `uscis.dhs.gov`, `ice.gov`, `irs.gov`, `ssa.gov`, `state.gov`, `usa.gov`, `treasury.gov`, US embassy/consulate addresses.
   - Canada: any `.gc.ca` domain, `canada.ca`, `cbsa-asfc.gc.ca` (CBSA), `cic.gc.ca` / `ircc` (immigration), Service Canada, CRA, or a `.ca.gov`-style provincial address.
   - Also flag display names that clearly name a government body (e.g. "Department of…", "Border Services", "Customs", "Immigration", "Internal Revenue Service") even if the domain is a generic mailer.
   Use judgment — marketing/newsletter mail that merely mentions government topics does NOT count; only mail that genuinely originates from a government agency does. When genuinely uncertain about a borderline sender, include it (false positive is safer than a missed official notice).

3. If ZERO senders qualify, stop. Do not send any message.

4. If one or more qualify, invoke the `marvin-imsg` skill (read its SKILL.md) and send ONE text to Kyle at +16043684730 summarizing them. Format the text plainly, e.g.:
   "Heads up — government email(s) in your personal inbox today:
   • <Sender name / address> — \"<subject>\"
   • <Sender name / address> — \"<subject>\""
   Keep it concise; one line per email. Send only the text (no attachment).

Constraints:
- Only the PERSONAL account (kylexrich@gmail.com). Do not touch the EMLY account.
- Do not mark anything read, reply, label, or otherwise modify the inbox — read only.
- If the gog search fails with `invalid_grant` / token-revoked, text Kyle that the personal Gmail token needs re-auth (`gog auth add kylexrich@gmail.com`) instead of silently failing.
- Each run is fresh with no memory of prior runs. The 24h window may occasionally overlap a day boundary; minor duplicate notices are acceptable.