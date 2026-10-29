# Google Play build

The Play build is the normal release app (`com.zabolotny.bzz`) built with `EXPO_PUBLIC_STORE=play`:

- The in-app GitHub updater is off (`PLAY_BUILD` in `src/version.ts`, so `UPDATER_ENABLED` is false). The Updates row in Settings is hidden.
- `scripts/configure-android.sh` removes `REQUEST_INSTALL_PACKAGES` from the manifest (Play restricts this permission).
- It's signed with the existing release key from `keystore/keystore.properties`, which works as the Play **upload key**.

```bash
export EXPO_PUBLIC_STORE=play NODE_ENV=production
npx expo prebuild -p android        # only if ./android does not exist yet
bash scripts/configure-android.sh   # prints "in-app updater: OFF"
# Play versionCodes must keep increasing (first Play upload: 36); set it in android/app/build.gradle
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
java -jar bundletool-all.jar dump manifest --bundle app-release.aab | grep -E 'package=|REQUEST_INSTALL'
```

Store texts and form answers are in `design/store/`.
