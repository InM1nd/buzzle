/**
 * v1.6 Pumpkin Night intro clip (native, expo-video): fullscreen, once per event right before the night-falls transition.
 * The clip ends on solid NIGHT_BG, so App hands off to the transition without a cut. Tap anywhere or «Skip» ends it;
 * sound follows the game's sound switch; an error or a clip that does not start within 2 s falls back to the plain transition.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { t } from "../i18n";
import { canSkip, INTRO_BG, IntroProps } from "./introVideoShared";

const CLIP = require("../../assets/video/halloween_intro.mp4");

export function IntroVideo({ muted, onEnd, bottomInset }: IntroProps) {
  const done = useRef(false);
  const shownAt = useRef(Date.now());
  const end = (played: boolean) => { if (done.current) return; done.current = true; onEnd(played); };
  const player = useVideoPlayer(CLIP, (p) => { p.loop = false; p.muted = muted; p.play(); });
  useEffect(() => {
    const subs = [
      player.addListener("playToEnd", () => end(true)),
      player.addListener("statusChange", ({ status }) => { if (status === "error") end(false); }),
    ];
    // back from the background: the player was paused by the system; play on, or hand over if it failed meanwhile
    const app = AppState.addEventListener("change", (st) => {
      if (st !== "active" || done.current) return;
      if (player.status === "error") end(false);
      else player.play();
    });
    const tm = setTimeout(() => { if (!player.playing && player.currentTime < 0.05) end(false); }, 2000);
    return () => { subs.forEach((s) => s.remove()); app.remove(); clearTimeout(tm); };
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.root]} onPress={() => { if (canSkip(shownAt.current, Date.now())) end(true); }} accessibilityRole="button" accessibilityLabel={t("intro.skip")}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
      </View>
      <View pointerEvents="none" style={[styles.skip, { bottom: 24 + bottomInset }]}><Text style={styles.skipT}>{t("intro.skip")}</Text></View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: { backgroundColor: INTRO_BG, zIndex: 100, elevation: 100 },
  skip: { position: "absolute", right: 18, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: "rgba(23,19,64,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  skipT: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700" },
});
