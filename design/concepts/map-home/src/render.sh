#!/bin/bash
cd "$(dirname "$0")"; python3 gen2.py || exit 1
for n in M1 M2 M3; do google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 --window-size=390,844 --screenshot="$PWD/$n.png" "file://$PWD/$n.html" 2>/dev/null; done
