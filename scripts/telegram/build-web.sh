#!/usr/bin/env bash
# Telegram Mini App / mobile web build -> dist-web/ (base path /buzzle for GitHub Pages; override with BZZ_WEB_BASE)
set -euo pipefail
cd "$(dirname "$0")/../.."
export BZZ_WEB_BASE="${BZZ_WEB_BASE-/buzzle}"
OUT="${1:-dist-web}"
rm -rf "$OUT"
CI=1 npx expo export -p web --output-dir "$OUT" --clear
python3 scripts/telegram/postprocess.py "$OUT"
rm -f "$OUT/metadata.json"
du -sh "$OUT"
