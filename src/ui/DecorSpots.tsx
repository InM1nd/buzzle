/** v1.5: decorations stand on fixed spots in the hive / garden scene, animate, and can be put out or away.
 *  An empty spot shows a faint silhouette; tapping any spot opens a small card (place / put away / where to get it). */
import { t } from "../i18n";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { ALL_DECOS, ITEM_BY_ID } from "../logic/loot";
import { GameState } from "../logic/game";
import { ITEM_ART } from "./beeArt";
import { RARITY_UI } from "./lootUi";
import { useAnimActive } from "./anim";
import { C, F, K, themed } from "./theme";
import { CloseBtn, GameButton, Overlay, Press, Txt } from "./components";

/** spot = fraction of the scene box (left/top of the item's foot) and the item height relative to the scene height */
export interface Spot { id: string; x: number; y: number; h: number; flip?: boolean }

type Motion = "sway" | "glow" | "spin" | "bob" | "none";
const MOTION: Record<string, Motion> = {
  flags: "sway", lanterns: "glow", barrel: "none", fountain: "bob",
  mushroom: "bob", bench: "none", pinwheel: "spin", gnome: "sway",
  jack1: "glow", jack2: "glow", jack3: "glow", jack4: "glow",
};

function DecoArt({ id, height, on, ghost }: { id: string; height: number; on: boolean; ghost: boolean }) {
  const a = ITEM_ART[`deco_${id}`];
  const v = useRef(new Animated.Value(0)).current;
  const motion = ghost ? "none" : MOTION[id] ?? "none";
  useEffect(() => {
    if (!on || motion === "none") { v.stopAnimation(); return; }
    const dur = motion === "spin" ? 2600 : motion === "glow" ? 1500 : 2200;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, easing: motion === "spin" ? Easing.linear : Easing.inOut(Easing.sin), useNativeDriver: true }));
    v.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [on, motion, v]);
  if (!a) return null;
  const w = (a.w / a.h) * height;
  const tr: any[] = [];
  if (motion === "sway") tr.push({ rotate: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "-4deg", "0deg", "4deg", "0deg"] }) });
  if (motion === "bob") tr.push({ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -height * 0.04, 0] }) });
  if (motion === "glow") tr.push({ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] }) });
  return (
    <View style={{ width: w, height, alignItems: "center" }}>
      {motion === "glow" && !ghost ? (
        <Animated.View pointerEvents="none" style={{
          position: "absolute", left: -w * 0.25, top: height * 0.05, width: w * 1.5, height: w * 1.5, borderRadius: w,
          // jack-o'-lanterns glow warm orange and softer (a pale disc reads grey on the night hive)
          backgroundColor: id.startsWith("jack") ? "#FF9F3A" : "#FFE9A0",
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: id.startsWith("jack") ? [0.06, 0.2, 0.06] : [0.15, 0.45, 0.15] }),
        }} />
      ) : null}
      {motion === "spin" && !ghost ? (
        // the pinwheel's head turns; the stick stays
        <Animated.Image source={a.src} style={{ width: w, height, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "8deg"] }) }] }} />
      ) : (
        <Animated.Image source={a.src} style={{ width: w, height, opacity: ghost ? 0.22 : 1, tintColor: ghost ? "#8A5A1E" : undefined, transform: tr }} />
      )}
    </View>
  );
}

export function DecorSpots({ s, place, spots, w, h, onToggle, onShop }: {
  s: GameState; place: "hive" | "garden"; spots: Spot[]; w: number; h: number;
  onToggle: (id: string) => void; onShop: () => void;
}) {
  const on = useAnimActive();
  const [open, setOpen] = useState<string | null>(null);
  const owned = (id: string) => s.loot.owned.includes(id);
  const shown = (id: string) => owned(id) && !s.loot.hidden.includes(id);
  const it = open ? ITEM_BY_ID[open] : null;
  return (
    <>
      {/* event lanterns are not sold: their spot stays empty until one is carved */}
      {spots.filter((sp) => ALL_DECOS.some((d) => d.id === sp.id && d.place === place && (!d.event || owned(d.id)))).map((sp) => {
        const a = ITEM_ART[`deco_${sp.id}`];
        if (!a) return null;
        const ih = sp.h * h, iw = (a.w / a.h) * ih;
        const ghost = !shown(sp.id);
        const name = ITEM_BY_ID[sp.id]?.name ?? "";
        return (
          <Press key={sp.id} onPress={() => setOpen(sp.id)} scaleTo={0.92}
            accessibilityRole="button" accessibilityLabel={ghost ? t("dec.spot", { name }) : name}
            style={{ position: "absolute", left: sp.x * w - iw / 2, top: sp.y * h - ih, width: iw, height: ih, transform: sp.flip ? [{ scaleX: -1 }] : undefined }}>
            {ghost ? <View style={[styles.ghostRing, { width: iw * 1.1, height: ih * 0.3, left: -iw * 0.05, top: ih * 0.8 }]} /> : null}
            <DecoArt id={sp.id} height={ih} on={on} ghost={ghost} />
            {ghost ? <View style={[styles.plus, { left: iw / 2 - 12, top: ih * 0.45 - 12 }]}><Txt v="small" color="#fff" style={[F.black, { lineHeight: 18 }]}>+</Txt></View> : null}
          </Press>
        );
      })}
      <Overlay visible={!!open} onClose={() => setOpen(null)}>
        <CloseBtn onPress={() => setOpen(null)} />
        {open && it ? (
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={[styles.art, { backgroundColor: RARITY_UI[it.rarity].bg }]}>
              <DecoArt id={open} height={120} on={on} ghost={!owned(open)} />
            </View>
            <Txt v="h2" center>{it.name}</Txt>
            <Txt v="tiny" color={RARITY_UI[it.rarity].color} style={F.black}>{RARITY_UI[it.rarity].name.toUpperCase()}</Txt>
            {owned(open) ? (
              <GameButton title={shown(open) ? t("dec.remove") : t("dec.place")} color={shown(open) ? "white" : "green"}
                onPress={() => { onToggle(open); setOpen(null); }} style={{ alignSelf: "stretch", marginTop: 6 }} />
            ) : (<>
              <Txt v="small" color={C.dim} center>{t("dec.where")}</Txt>
              <GameButton title={t("dec.toShop")} color="honey" onPress={() => { setOpen(null); onShop(); }} style={{ alignSelf: "stretch", marginTop: 6 }} />
            </>)}
          </View>
        ) : null}
      </Overlay>
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  plus: { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: K.bg("rgba(216,150,40,0.85)"), alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: K.bd("#fff") },
  ghostRing: { position: "absolute", borderRadius: 999, borderWidth: 2, borderStyle: "dashed", borderColor: K.bd("rgba(200,140,40,0.55)"), backgroundColor: K.bg("rgba(255,255,255,0.25)") },
  art: { width: 180, height: 150, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 8 },
}));
