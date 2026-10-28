#!/usr/bin/env bash
# Re-applies local build customisations after `npx expo prebuild` (which regenerates ./android).
set -euo pipefail
cd "$(dirname "$0")/.."
GP=android/gradle.properties
# make sure the file ends with a newline before appending
[ -n "$(tail -c1 $GP)" ] && echo >> $GP
# set_prop KEY VALUE: replace if present, append otherwise
set_prop() {
python3 - "$GP" "$1" "$2" <<'PY'
from pathlib import Path
import sys,re
p=Path(sys.argv[1]);key,value=sys.argv[2:];s=p.read_text();pattern=r'^'+re.escape(key)+r'=.*$'
s=re.sub(pattern,key+'='+value,s,flags=re.M) if re.search(pattern,s,re.M) else s.rstrip()+'\n'+key+'='+value+'\n'
p.write_text(s)
PY
}
set_prop org.gradle.jvmargs '-Xmx2560m -XX:MaxMetaspaceSize=640m -Dfile.encoding=UTF-8'
set_prop org.gradle.parallel false
set_prop reactNativeArchitectures arm64-v8a
set_prop org.gradle.workers.max 3
set_prop kotlin.compiler.execution.strategy in-process
# Native libs: stored uncompressed + 16 KB page-aligned in the APK (AGP default,
# extractNativeLibs=false) - the layout Android 15/16 and Pixel 16 KB mode expect.
# R8 minification + resource shrinking reduce size; verify the actual signed APK.
set_prop expo.useLegacyPackaging false
set_prop android.enableMinifyInReleaseBuilds true
set_prop android.enableShrinkResourcesInReleaseBuilds true

APPG=android/app/build.gradle
if ! grep -q 'bzz-release' $APPG; then
python3 - "$APPG" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
# load keystore.properties
s = s.replace("android {", """def bzz = new Properties()
def bzzFile = rootProject.file('../keystore/keystore.properties')
if (bzzFile.exists()) { bzzFile.withInputStream { bzz.load(it) } } // bzz-release

android {""", 1)
# add release signing config next to debug
s = s.replace("""    signingConfigs {
        debug {""", """    signingConfigs {
        release {
            if (bzzFile.exists()) {
                storeFile file(bzz['storeFile'])
                storePassword bzz['storePassword']
                keyAlias bzz['keyAlias']
                keyPassword bzz['keyPassword']
            }
            enableV1Signing true
            enableV2Signing true
            enableV3Signing true
        }
        debug {""", 1)
# use it for release build type
rel = s.index("        release {", s.index("buildTypes {"))
blk_end = s.index("signingConfig signingConfigs.debug", rel)
s = s[:blk_end] + "signingConfig signingConfigs.release" + s[blk_end+len("signingConfig signingConfigs.debug"):]
open(p, "w").write(s)
PY
fi
# v1.4 in-app updater (GitHub Releases). A Play Store build turns it off:
#   BZZ_UPDATER=off bash scripts/configure-android.sh && EXPO_PUBLIC_BZZ_UPDATER=off ./gradlew assembleRelease
#   Google Play build: EXPO_PUBLIC_STORE=play bash scripts/configure-android.sh (implies BZZ_UPDATER=off)
MAN=android/app/src/main/AndroidManifest.xml
[ "${EXPO_PUBLIC_STORE:-}" = "play" ] && BZZ_UPDATER=off
if [ "${BZZ_UPDATER:-on}" = "off" ]; then
  python3 - "$MAN" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);p.write_text(''.join(line for line in p.read_text().splitlines(True) if 'android.permission.REQUEST_INSTALL_PACKAGES' not in line))
PY
  echo "in-app updater: OFF (no REQUEST_INSTALL_PACKAGES)"
elif ! grep -q REQUEST_INSTALL_PACKAGES $MAN; then
  python3 - "$MAN" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text();s=s.replace('<uses-permission android:name="android.permission.INTERNET"/>','<uses-permission android:name="android.permission.INTERNET"/>\n  <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>');p.write_text(s)
PY
fi
echo "android/ configured"
