#!/bin/bash
# usage: render.sh name  (expects src/<name>.html; writes ../<name>.png at 2x)
set -e
cd "$(dirname "$0")"
for n in "$@"; do
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=1120,1240 --virtual-time-budget=4000 --screenshot="$PWD/../$n.png" "file://$PWD/$n.html" 2>/dev/null
done
