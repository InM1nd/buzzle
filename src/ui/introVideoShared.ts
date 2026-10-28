/** shared by IntroVideo (native, expo-video) and IntroVideo.web (<video muted playsInline>) */
export const INTRO_BG = "#171340";
/** played: the clip reached its last frame or was skipped (the screen is NIGHT_BG); false = it failed, use the plain transition */
export interface IntroProps { muted: boolean; onEnd: (played: boolean) => void; bottomInset: number }

/** taps in the first moments are ignored: a tap meant for the screen before the clip must not skip it */
export const SKIP_GUARD_MS = 800;
export const canSkip = (shownAt: number, now: number): boolean => now - shownAt >= SKIP_GUARD_MS;
