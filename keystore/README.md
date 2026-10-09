# Release signing (local only)

Everything in this folder except this README and `keystore.properties.example` is git-ignored.

- `bzz-release.jks` – the release keystore (alias `bzz`; the file name predates the Buzzle rename).
  **Keep a backup**: updates only install over an existing app if they are signed with the same key.
- `keystore.properties` – read by `scripts/configure-android.sh` → `android/app/build.gradle`.
- `SECRETS.local.md` – human-readable note with the passwords (local, untracked).

Certificate: CN=Bzz, OU=Personal, O=Alexander Zabolotny, L=Wien, C=AT ·
SHA-256 `79:0C:F7:3C:A6:6C:F9:7B:E3:A1:0C:27:0E:79:6F:1C:9D:6C:67:57:A2:39:F5:72:3B:6E:97:AE:E1:37:7B:DC`

Fresh clone: copy `keystore.properties.example` to `keystore.properties`, put the `.jks` next to it and
fill in the passwords (without it the release APK is not signed with your key).
