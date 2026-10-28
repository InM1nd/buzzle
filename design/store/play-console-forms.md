# Play Console forms: cheat sheet

These answers are for the **Play build** on branch `play-store` (`EXPO_PUBLIC_STORE=play`): package `com.zabolotny.bzz`, versionCode 36 or higher, built **without** analytics. They were checked against the code on `main` (94941b5). If PR #12 (PostHog analytics) is merged into a Play build, update the Data safety section. The answers for that case are in "After analytics" below.

## Store settings
- App or game: **Game**. Category: **Puzzle**. You could also pick Casual, but Puzzle fits the main loop better.
- Free or paid: **Free**.
- Contact email: zabolotny1111@gmail.com. Website (optional): https://github.com/InM1nd/buzzle
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

## Data safety (Play build, no analytics)
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

### After analytics (PR #12) ships in a Play build
- Collects data: **Yes**. Shared: **No**. PostHog is a service provider (processor), which doesn't count as sharing.
- Data types:
  - **App activity → App interactions**: first open, session start, daily puzzle, streak, free-play and event points.
  - **Device or other IDs**: a random install ID generated in the app. It isn't the advertising ID or an Android ID.
- For each type: collected, **not** processed ephemerally, **optional** (users can turn it off in Settings → Statistics; on by default, opt-out), purpose **Analytics**.
- Encrypted in transit: **Yes** (HTTPS to eu.i.posthog.com). Deletion: by turning analytics off or resetting progress (a new random ID). Data already sent can be deleted on request by email.
- The privacy policy is already updated in PR #12.

## Other declarations
- News app: No. COVID-19 app: No. Government app: No. Financial features: None. Health: No.
- Data safety and the advertising ID: the app doesn't use the advertising ID. Declare **No**. If an AD_ID permission check is flagged, the merged manifest doesn't contain `com.google.android.gms.permission.AD_ID`.

## Release notes for closed testing
- **Closed testing:** new personal developer accounts must run a closed test with at least **12 opted-in testers for 14 consecutive days** before they can apply for production. Check the current number in Play Console.
- **Play App Signing:** the AAB is signed with the existing release key (SHA-256 `79:0C:F7:3C:…:37:7B:DC`), which is used as the **upload key**. If Google generates a new app signing key, Play installs will have a different certificate from the GitHub APKs. Testers then have to uninstall the sideloaded app before installing from Play: their progress is lost unless they export a save code first. To avoid that, choose "Use existing app signing key" and upload the current key with PEPK during setup.
- **versionCode:** the Play track starts at **36**, above the dev builds (≤35). Every later upload must be higher. Stable GitHub APKs currently use 28.
