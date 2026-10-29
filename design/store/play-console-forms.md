# Play Console forms: cheat sheet

These answers are for the **Play build** on branch `play-store` (`EXPO_PUBLIC_STORE=play`): package `com.zabolotny.bzz`, versionCode 36 or higher. Version 1.6.2 adds anonymous analytics (PostHog EU, opt-out). A Play build made from 1.6.2+ with the PostHog key uses the "With analytics" answers below; a build without the key uses "no analytics".

## Store settings
- App or game: **Game**. Category: **Puzzle**. You could also pick Casual, but Puzzle fits the main loop better.
- Free or paid: **Free**.
- Contact email: zabolotnyi.dev@gmail.com. Website (optional): https://github.com/InM1nd/buzzle
- **Privacy policy URL:** https://inm1nd.github.io/buzzle/privacy/ (live and in en/uk/ru; the app links it in Settings → About).

## App access
- **All functionality is available without special access.** There's no login, account, region lock or paywall.
- Night Flight and the Pumpkin Night event are date-gated. If a reviewer asks, they're seasonal (20 Oct – 9 Nov).

## Ads
- **No, my app does not contain ads.** There's no ad SDK in the build.

## Content rating (IARC questionnaire)
- Category: **Game** (puzzle/casual, cartoon bees).
- Violence, blood, gore: **No**. The Halloween ghost and pumpkins are cute cartoon decorations with no fighting.
- Fear or horror: **No**.
- Sexuality or nudity: **No**. Language/profanity: **No**. Drugs, alcohol, tobacco: **No**. A wooden "barrel" decoration only; no alcohol is shown or mentioned.
- Gambling:
  - Real-money or simulated gambling (casino, betting): **No**.
  - There are randomized rewards ("surprise combs"), but they're earned by playing only and never sold. If asked about randomized items bought with real money: **No**.
- Users can interact or communicate with each other: **No**. "Invite a friend" and "export save" only open the system share sheet with a text.
- Shares the user's location with other users: **No**.
- Digital purchases: **No**.
- Unrestricted internet or browser: **No**. External links open in the browser and are limited to the GitHub page, the privacy policy and release notes.
- Expected result: **Everyone / PEGI 3 / USK 0**.

## Target audience and content
- Target age groups: **13–15, 16–17, 18+**. Do **not** tick any group under 13, so the app stays out of the Families program.
- Appeals to children: if asked whether the store listing could unintentionally appeal to children, answer **No**. Its look is cute but the audience is general (teens and adults). Mention that there are no ads, no purchases and no data collection.

## Data safety (Play build without the PostHog key)
- Does your app collect or share any of the required user data types? **No.**
  - Progress, settings and reminders are stored **only on the device** (AsyncStorage) and never transmitted. Play doesn't count on-device-only data as "collected".
  - Telegram CloudStorage is used only in the Telegram web version, not in the Android app.
  - The GitHub update check is **disabled** in the Play build (`UPDATER_ENABLED` is false and the `REQUEST_INSTALL_PACKAGES` permission is removed).
  - Notifications are local, scheduled on the device. There's no push token and no `google-services.json`. The Firebase classes in the manifest come from expo-notifications and are inactive.
  - "Invite a friend" and "save code" go through the system share sheet, so the user chooses where to send them. "GitHub", "Privacy policy" and "Release notes" are links the user opens in the browser.
- Is all data encrypted in transit? There's no data to answer for. If the form still asks, answer **Yes**, because the only requests are HTTPS links the user opens.
- Data deletion: the user can delete all data in-app with **Settings → Reset progress**, or by uninstalling. No account exists.
- Permissions in the AAB:
  - INTERNET, ACCESS_NETWORK_STATE, VIBRATE, WAKE_LOCK
  - POST_NOTIFICATIONS (reminders)
  - RECEIVE_BOOT_COMPLETED (re-scheduling reminders after a reboot)
  
  None are sensitive or need a declaration form.

### With analytics (v1.6.2 and later, PR #12 via release PR #17)
Checked against the code on `release-1.6.2` (`src/platform/analytics.ts`, `src/logic/analytics.ts`, `App.tsx`). Applies to any Play build made with `EXPO_PUBLIC_POSTHOG_KEY` set. Without the key the analytics code does nothing, and the "no analytics" answers above still apply.
- Does your app collect or share any of the required user data types? **Yes** (collected). Shared: **No**. PostHog (EU cloud, eu.i.posthog.com) is our service provider/processor, which Play doesn't count as sharing.
- Data types to declare:
  - **App activity → App interactions.** Events: `first_open`, `session_start` (on launch and after 30+ min in the background), `daily_complete` (stars, first_today), `streak_day` (length, best), `streak_break` (previous), `streak_freeze_used` (length), `free_play_round` (score, record), `event_points` (event_id, points, total). Every event also carries `platform` (android/telegram/web), `app_version`, `app_build` and `dev` on dev builds.
  - **Device or other IDs.** A random UUID generated by the app (`aid`, kept in the save). It isn't the advertising ID, the Android ID or a Telegram ID.
  - Not collected: location (`$geoip_disable` is set, so PostHog skips the IP-to-location lookup), personal info, contacts, messages, photos, files, app info and performance, or crash logs.
- For both types:
  - Collected: **Yes**. Processed ephemerally: **No**.
  - Required or optional: **Optional**. It is on by default and can be turned off in Settings → Statistics; turning it off stops sending and deletes queued events.
  - Purpose: **Analytics** only.
- Encrypted in transit: **Yes** (HTTPS).
- Can users request deletion? **Yes**. Settings → Reset progress makes a new random ID, so later events can't be linked to earlier ones. Already-sent data is deleted on request to zabolotnyi.dev@gmail.com; the privacy policy says this.
- Privacy policy: https://inm1nd.github.io/buzzle/privacy/ describes this from v1.6.2 (it goes live when the release is deployed to the site root).
- Note on the IP address: PostHog receives the request IP like any web request. The app sends no IP-derived data, and geo lookup is disabled. For extra safety, turn on "Discard client IP data" in the PostHog project settings.

## Other declarations
- News app: No. COVID-19 app: No. Government app: No. Financial features: None. Health: No.
- Data safety and the advertising ID: the app doesn't use the advertising ID. Declare **No**. If an AD_ID permission check is flagged, the merged manifest doesn't contain `com.google.android.gms.permission.AD_ID`.

## Release notes for closed testing
- **Closed testing:** new personal developer accounts must run a closed test with at least **12 opted-in testers for 14 consecutive days** before they can apply for production. Check the current number in Play Console.
- **Play App Signing:** the AAB is signed with the existing release key (SHA-256 `79:0C:F7:3C:…:37:7B:DC`), which is used as the **upload key**. If Google generates a new app signing key, Play installs will have a different certificate from the GitHub APKs. Testers then have to uninstall the sideloaded app before installing from Play: their progress is lost unless they export a save code first. To avoid that, choose "Use existing app signing key" and upload the current key with PEPK during setup.
- **versionCode:** the Play track starts at **36**, above the dev builds (≤35). Every later upload must be higher. Stable GitHub APKs currently use 28.
