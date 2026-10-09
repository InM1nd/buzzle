#!/usr/bin/env bash
# Publish dist-web/ to the gh-pages branch of InM1nd/buzzle (GitHub Pages: https://inm1nd.github.io/buzzle/).
# Needs GITHUB_TOKEN_PUSH in the environment; the token is passed as an HTTP header and never printed.
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f dist-web/index.html ] || { echo "run scripts/telegram/build-web.sh first"; exit 1; }
REV=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
cp -r dist-web/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="Oleksandr Zabolotnyi" -c user.email="91841909+InM1nd@users.noreply.github.com" commit -q -m "Buzzle web / Telegram Mini App build ($REV)"
git -c http.extraHeader="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN_PUSH" | base64 -w0)" \
  push -f https://github.com/InM1nd/buzzle.git gh-pages:gh-pages
rm -rf "$TMP"
