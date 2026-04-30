#!/usr/bin/env bash
# verify-logos.sh — deterministic logo URL verification.
#
# Reads URLs from stdin (one per line) or from argv, and for each one issues a
# HEAD request with a 5-second timeout. A URL passes only if:
#   * HTTP status is 200, AND
#   * Content-Type begins with "image/".
#
# Exits 0 only if every URL passes. Prints one line per URL:
#   OK   <status> <content-type> <url>
#   FAIL <status> <content-type> <url>
#
# Usage:
#   scripts/verify-logos.sh url1 url2 ...
#   cat urls.txt | scripts/verify-logos.sh
#
# Intentionally has no project-specific assumptions.

set -u

fail=0
check() {
  local url=$1
  local line status ctype
  line=$(curl -sI -L -m 5 -o /dev/null -w '%{http_code} %{content_type}' "$url" || true)
  status=${line%% *}
  ctype=${line#* }
  if [[ "$status" == "200" && "$ctype" == image/* ]]; then
    printf 'OK   %s %s %s\n' "$status" "$ctype" "$url"
  else
    printf 'FAIL %s %s %s\n' "${status:-000}" "${ctype:-none}" "$url"
    fail=1
  fi
}

if [[ $# -gt 0 ]]; then
  for u in "$@"; do check "$u"; done
else
  while IFS= read -r u; do
    [[ -z "$u" ]] && continue
    check "$u"
  done
fi

exit $fail
