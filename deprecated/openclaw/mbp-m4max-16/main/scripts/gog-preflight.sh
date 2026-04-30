#!/usr/bin/env bash
set -euo pipefail

echo "[gog skill readiness]"
openclaw skills info gog

echo

echo "[gog binary]"
gog --version

echo

echo "[gog auth accounts]"
gog auth list
