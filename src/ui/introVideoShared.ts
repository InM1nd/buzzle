/** shared by IntroVideo (native, expo-video) and IntroVideo.web (<video muted playsInline>) */
export const INTRO_BG = "#171340";
/** played: the clip reached its last frame or was skipped (the screen is NIGHT_BG); false = it failed, use the plain transition */
export interface IntroProps { muted: boolean; onEnd: (played: boolean) => void; bottomInset: number }
