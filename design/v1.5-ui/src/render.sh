#!/bin/bash
# Рендер макетов: 390×844 @3x (и копии 360) через headless Chrome
cd "$(dirname "$0")"; mkdir -p ../screens ../screens-360
for f in html/*.html; do n=$(basename "$f" .html); w=390; out=../screens/$n.png
  [[ $n == *@360 ]] && { w=360; out=../screens-360/${n%@360}.png; }
  rm -f "$out"; google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=3 --window-size=$w,844 --screenshot="$PWD/$out" "file://$PWD/$f" 2>/dev/null
done
