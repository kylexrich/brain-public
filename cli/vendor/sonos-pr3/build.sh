#!/usr/bin/env bash
set -euo pipefail

# Build sonos-pr3 from pinned source metadata.
#
# Defaults come from SOURCE.json in this folder.
# Override with env vars if needed:
#   SONOSCLI_REPO, SONOSCLI_REF, SONOSCLI_PACKAGE
#   OUT_BIN (default: bin/sonos-pr3)
#
# Outputs:
#   - bin/sonos-pr3
#   - vendor/sonos-pr3/dist/sonos-pr3
#   - vendor/sonos-pr3/current-build.txt
#   - vendor/sonos-pr3/current-build.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$WORKSPACE_DIR/.." && pwd)"
SOURCE_JSON="${SOURCE_JSON:-$SCRIPT_DIR/SOURCE.json}"
OUT_BIN="${OUT_BIN:-$WORKSPACE_DIR/bin/sonos-pr3}"
DIST_BIN="$SCRIPT_DIR/dist/sonos-pr3"

if ! command -v go >/dev/null 2>&1; then
  echo "[sonos-pr3] go is required but not found in PATH" >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "[sonos-pr3] git is required but not found in PATH" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_JSON" ]]; then
  echo "[sonos-pr3] missing source metadata: $SOURCE_JSON" >&2
  exit 1
fi

read -r DEFAULT_REPO DEFAULT_REF DEFAULT_PACKAGE < <(
  node -e 'const fs=require("node:fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(`${String(data.repo ?? "").trim()} ${String(data.ref ?? "").trim()} ${String(data.package ?? "./cmd/sonos").trim()}`);' "$SOURCE_JSON"
)

SONOSCLI_REPO="${SONOSCLI_REPO:-$DEFAULT_REPO}"
SONOSCLI_REF="${SONOSCLI_REF:-$DEFAULT_REF}"
SONOSCLI_PACKAGE="${SONOSCLI_PACKAGE:-$DEFAULT_PACKAGE}"

if [[ -z "$SONOSCLI_REPO" || -z "$SONOSCLI_REF" ]]; then
  echo "[sonos-pr3] repo/ref cannot be empty (repo='$SONOSCLI_REPO' ref='$SONOSCLI_REF')" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$(dirname "$OUT_BIN")" "$SCRIPT_DIR/dist"

echo "[sonos-pr3] cloning: $SONOSCLI_REPO"
git clone "$SONOSCLI_REPO" "$TMP_DIR/sonoscli" >/dev/null

cd "$TMP_DIR/sonoscli"
git checkout "$SONOSCLI_REF" >/dev/null
ACTUAL_COMMIT="$(git rev-parse HEAD)"

BUILD_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Build for the current host by default (this machine is darwin/arm64).
echo "[sonos-pr3] building $SONOSCLI_PACKAGE @ $ACTUAL_COMMIT"
CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -o "$TMP_DIR/sonos-pr3.new" "$SONOSCLI_PACKAGE"

if [[ -f "$OUT_BIN" ]]; then
  cp "$OUT_BIN" "$OUT_BIN.bak"
  echo "[sonos-pr3] backup: $OUT_BIN.bak"
fi

mv "$TMP_DIR/sonos-pr3.new" "$OUT_BIN"
chmod +x "$OUT_BIN"
cp "$OUT_BIN" "$DIST_BIN"

SHA256="$(shasum -a 256 "$OUT_BIN" | awk '{print $1}')"
GO_VERSION_M="$(go version -m "$OUT_BIN" 2>/dev/null || true)"
OUT_BIN_REL="$(node -e 'const path=require("node:path"); console.log(path.relative(process.argv[1], process.argv[2]) || ".")' "$REPO_ROOT" "$OUT_BIN")"
DIST_BIN_REL="$(node -e 'const path=require("node:path"); console.log(path.relative(process.argv[1], process.argv[2]) || ".")' "$REPO_ROOT" "$DIST_BIN")"
GO_VERSION_M_REL="${GO_VERSION_M//$OUT_BIN/$OUT_BIN_REL}"

echo "[sonos-pr3] installed: $OUT_BIN"
echo "[sonos-pr3] dist copy: $DIST_BIN"
echo "[sonos-pr3] sha256: $SHA256"

cat > "$SCRIPT_DIR/current-build.txt" <<EOF
built_at_utc: $BUILD_TIME_UTC
repo: $SONOSCLI_REPO
ref_requested: $SONOSCLI_REF
commit_built: $ACTUAL_COMMIT
package: $SONOSCLI_PACKAGE
out_bin: $OUT_BIN_REL
dist_bin: $DIST_BIN_REL
sha256: $SHA256

$GO_VERSION_M_REL
EOF

node -e 'const fs=require("node:fs"); const [path,builtAtUtc,repo,refRequested,commitBuilt,packageName,outBin,distBin,sha256]=process.argv.slice(1); const payload={builtAtUtc,repo,refRequested,commitBuilt,package:packageName,outBin,distBin,sha256}; fs.writeFileSync(path, JSON.stringify(payload,null,2)+"\n","utf8");' "$SCRIPT_DIR/current-build.json" "$BUILD_TIME_UTC" "$SONOSCLI_REPO" "$SONOSCLI_REF" "$ACTUAL_COMMIT" "$SONOSCLI_PACKAGE" "$OUT_BIN_REL" "$DIST_BIN_REL" "$SHA256"

echo "[sonos-pr3] wrote metadata: $SCRIPT_DIR/current-build.txt"
echo "[sonos-pr3] wrote metadata: $SCRIPT_DIR/current-build.json"
