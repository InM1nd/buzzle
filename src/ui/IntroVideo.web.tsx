/** v1.6 Pumpkin Night intro clip, web / Telegram: a muted inline <video> (autoplay is allowed muted); blocked autoplay or
 *  an error falls back to the plain transition. See IntroVideo.tsx. */
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { INTRO_BG, IntroProps } from "./introVideoShared";

const CLIP = require("../../assets/video/halloween_intro.mp4");
const uri = (m: unknown): string => (typeof m === "string" ? m : (m as { uri?: string; default?: string })?.uri ?? (m as { default?: string })?.default ?? "");

export function IntroVideo({ onEnd, bottomInset }: IntroProps) {
  const done = useRef(false);
  const ref = useRef<HTMLVideoElement | null>(null);
  const end = (played: boolean) => { if (done.current) return; done.current = true; onEnd(played); };
  useEffect(() => {
    const v = ref.current;
    if (!v) { end(false); return; }
    v.muted = true;
    v.play().catch(() => end(false));
    const tm = setTimeout(() => { if (v.currentTime < 0.05) end(false); }, 2500);
    return () => clearTimeout(tm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const video = React.createElement("video", {
    ref, src: uri(CLIP), muted: true, playsInline: true, autoPlay: true, preload: "auto",
    onEnded: () => end(true), onError: () => end(false),
    style: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover", background: INTRO_BG },
  });
  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.root]} onPress={() => end(true)} accessibilityRole="button" accessibilityLabel={t("intro.skip")}>
      {video}
      <View pointerEvents="none" style={[styles.skip, { bottom: 24 + bottomInset }]}><Text style={styles.skipT}>{t("intro.skip")}</Text></View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: { backgroundColor: INTRO_BG, zIndex: 100 },
  skip: { position: "absolute", right: 18, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: "rgba(23,19,64,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  skipT: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700" },
});
