/** App version (kept in sync with app.json / build.gradle by tests/version.test.ts). */
export const APP_VERSION = "1.5.5";
export const APP_VERSION_CODE = 24;
export const GITHUB_REPO = "InM1nd/buzzle";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const PRIVACY_URL = "https://inm1nd.github.io/buzzle/privacy/";
/** side-by-side dev build (com.zabolotny.bzz.dev): built with EXPO_PUBLIC_BZZ_DEV=1; shows the developer switches */
export const DEV_BUILD = process.env.EXPO_PUBLIC_BZZ_DEV === "1";
