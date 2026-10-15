#!/bin/bash
cd "$(dirname "$0")"
for g in game_a.py game_b.py game_c.py game_d.py; do [ -f $g ] && { python3 $g || exit 1; }; done
for f in ${@:-A1 A2 B1 B2 C1 C2 D1 D2}; do [ -f $f.html ] && google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 --window-size=390,844 --screenshot="$PWD/$f.png" "file://$PWD/$f.html" 2>/dev/null; done
