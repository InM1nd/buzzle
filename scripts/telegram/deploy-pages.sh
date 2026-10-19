#!/usr/bin/env bash
# Publish dist-web/ to the gh-pages branch of InM1nd/buzzle (GitHub Pages: https://inm1nd.github.io/buzzle/).
# Needs GITHUB_TOKEN_PUSH in the environment; the token is passed as an HTTP header and never printed.
# A plain push: the new build is committed on top of the current gh-pages tip (no force, history kept).
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f dist-web/index.html ] || { echo "run scripts/telegram/build-web.sh first"; exit 1; }
REV=$(git rev-parse --short HEAD)
REPO=https://github.com/InM1nd/buzzle.git
AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN_PUSH" | base64 -w0)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git -c http.extraHeader="$AUTH" clone -q --depth 1 --branch gh-pages --single-branch "$REPO" "$TMP"
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist-web/. "$TMP/"
cd "$TMP"
git add -A
if git diff --cached --quiet; then echo "gh-pages already has this build"; exit 0; fi
git -c user.name="Oleksandr Zabolotnyi" -c user.email="zabolotny1111@gmail.com" commit -q -m "Buzzle web / Telegram Mini App build ($REV)"
git -c http.extraHeader="$AUTH" push "$REPO" HEAD:gh-pages
