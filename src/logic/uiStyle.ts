/** v1.6 interface style: the setting, and how it turns into the theme that is actually shown. Pure (no UI imports). */
export const UI_STYLES = ["auto", "classic", "midnight"] as const;
export type UiStyle = (typeof UI_STYLES)[number];
export type ThemeName = "classic" | "midnight";
/** "auto" follows the Halloween event: violet "midnight" during it, the classic warm look otherwise */
export const resolveTheme = (pref: UiStyle, halloween: boolean): ThemeName => (pref === "auto" ? (halloween ? "midnight" : "classic") : pref);
