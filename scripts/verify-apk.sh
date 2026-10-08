#!/usr/bin/env bash
# Usage: scripts/verify-apk.sh Bzz-v1.0.0.apk  -> prints a verification report
set -uo pipefail
APK=$1
BT=$ANDROID_HOME/build-tools/36.0.0
echo "== file"; ls -l "$APK"; stat -c %s "$APK"; sha256sum "$APK"
echo "== aapt badging"; $BT/aapt dump badging "$APK" | grep -E "^(package|sdkVersion|targetSdkVersion|uses-permission|application-label:|native-code|launchable)"
echo "== apksigner"; $BT/apksigner verify -v --print-certs "$APK" | grep -v "^WARNING"
echo "== apksigner (minSdk 21 -> v1 JAR signature)"; $BT/apksigner verify -v --min-sdk-version 21 "$APK" | grep -E "Verifies|v1 scheme|DOES NOT"
echo "== zipalign -c -P 16 -v 4"; $BT/zipalign -c -P 16 -v 4 "$APK" | grep -E "\.so|Verification"
echo "== native libs (must be Stored)"; unzip -v "$APK" | grep "\.so$"
echo "== ELF LOAD alignment"
T=$(mktemp -d); unzip -q -o "$APK" 'lib/*' -d "$T"
RE=$(ls $ANDROID_HOME/ndk/*/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-readelf | tail -1)
for f in "$T"/lib/arm64-v8a/*.so; do printf "%-40s %s\n" "$(basename $f)" "$($RE -lW $f | awk '/LOAD/{print $NF}' | sort -u | tr '\n' ' ')"; done
rm -rf "$T"
echo "== JS bundle"; unzip -l "$APK" | grep -E "index.android.bundle"
echo "== fonts"; $BT/aapt2 dump resources "$APK" | grep -iE "font/" | head
echo "== dex"; unzip -l "$APK" | grep -E "classes[0-9]*\.dex"
echo "== bundle format"; unzip -p "$APK" assets/index.android.bundle | head -c 8 | od -An -tx1
echo "== drawable art (sample)"; $ANDROID_HOME/build-tools/36.0.0/aapt2 dump resources "$APK" | grep -cE "drawable/assets_art_"
