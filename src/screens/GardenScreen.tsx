import { t } from "../i18n";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { GameState, dayColorInfo, flowerUnlocked, level, nextBedCost, seedPrice, seedsOwned, shownDecos } from "../logic/game";
import { RARITY_UI } from "../ui/lootUi";
import { DecorSpots, Spot } from "../ui/DecorSpots";
import {
  Bed, BED_HIVE_BONUS, canWater, FLOWER_BY_ID, FLOWERS, isReady, MAX_BEDS, progress, stageOf, WATER_HOURS,
} from "../logic/garden";
import { colorName } from "../logic/bees";
import { ART } from "../ui/art";
import { GARDEN_ART } from "../ui/beeArt";
import { Mascot } from "../ui/BeeSprite";
import { C, shadow } from "../ui/theme";
import { sinDeg, useAnimActive, useCycle } from "../ui/anim";
import { Bar, Card, CloseBtn, fmt, GameButton, Overlay, Press, Txt, useTopPad } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration, durationShort } from "../ui/format";

const H = 3600_000;
const COLOR_HEX = C.pollen;

interface Props {
  s: GameState;
  now: number;
  onPlant: (bed: number, flower: string) => boolean;
  onWater: (bed: number) => boolean;
  onWaterAll: () => boolean;
  onHarvest: (bed: number, from: Pt | null) => boolean;
  onUnlockBed: () => boolean;
  onIntroDone: () => void;
  onToggleDeco: (id: string) => void;
  onShop: () => void;
}

const GARDEN_SPOTS: Spot[] = [
  { id: "mushroom", x: 0.11, y: 0.96, h: 0.62 },
  { id: "bench", x: 0.37, y: 0.96, h: 0.6 },
  { id: "pinwheel", x: 0.63, y: 0.98, h: 1.05 },
  { id: "gnome", x: 0.88, y: 0.98, h: 0.95 },
];
const TONE = { ok: "#2A6FB0", dry: "#C2402A", ready: "#23864A", empty: "#8A6A48" };
const TONE_BG = { ok: "#E6F3FF", dry: "#FFE6DF", ready: "#E1F6E8", empty: "#F6ECD8" };

function flowerImg(b: Bed) {
  const st = stageOf(b);
  if (st === "empty") return null;
  if (st === "sprout") return GARDEN_ART.sprout;
  return GARDEN_ART[`${b.flower}_${st}`];
}

export function bedStatus(b: Bed): { text: string; tone: "ok" | "dry" | "ready" | "empty" } {
  if (!b.flower) return { text: t("gd.emptyBed"), tone: "empty" };
  if (isReady(b)) return { text: t("gd.ready", { n: FLOWER_BY_ID[b.flower].nectar }), tone: "ready" };
  if (b.water <= 0) return { text: t("gd.dry"), tone: "dry" };
  const need = FLOWER_BY_ID[b.flower].growHours - b.growth;
  if (b.water >= need - 1e-9) return { text: t("gd.bloomsIn", { t: duration(need * H) }), tone: "ok" };
  return { text: t("gd.waterLeft", { t: duration(b.water * H) }), tone: "ok" };
}

/** Compact timer badge under a bed: one icon + one short value (the full text is in the label and the bed dialog). */
function bedChip(b: Bed): { icon: number; tint?: string; text: string; tone: "ok" | "dry" | "ready" | "empty" } {
  if (!b.flower) return { icon: ART.seed, tint: TONE.empty, text: t("gd.plantShort"), tone: "empty" };
  if (isReady(b)) return { icon: ART.nectar, text: `+${FLOWER_BY_ID[b.flower].nectar}`, tone: "ready" };
  if (b.water <= 0) return { icon: ART.can, tint: TONE.dry, text: t("gd.dryShort"), tone: "dry" };
  const need = FLOWER_BY_ID[b.flower].growHours - b.growth;
  // water lasts until bloom: show the bloom timer; otherwise the water runs out first, show that
  if (b.water >= need - 1e-9) return { icon: ART.clock, tint: TONE.ok, text: durationShort(need * H), tone: "ok" };
  return { icon: ART.drop, text: durationShort(b.water * H), tone: "ok" };
}

function BedTile({ b, i, w, selected, onPress }: { b: Bed; i: number; w: number; selected: boolean; onPress: (ref: View | null) => void }) {
  const ref = useRef<View>(null);
  const pop = useRef(new Animated.Value(1)).current;
  const prevStage = useRef(stageOf(b));
  useEffect(() => {
    const st = stageOf(b);
    if (st !== prevStage.current) {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 }).start();
    }
    prevStage.current = st;
  }, [b, pop]);
  const sway = useRef(new Animated.Value(0)).current;
  const act = useAnimActive();
  useCycle(sway, 3000 + i * 260, act && !!b.flower, (i * 0.31) % 1);
  const st = bedStatus(b);
  const chip = bedChip(b);
  const wet = b.flower && b.water > 0 && !isReady(b);
  const img = flowerImg(b);
  const bedSrc = wet ? require("../../assets/art/env/bed_wet.webp") : require("../../assets/art/env/bed_dry.webp");
  // bed art is 360×185 with the box between y≈50 and y≈135; soil centre ≈ 0.44, front rim from ≈ 0.57
  const bw = w - 12, bh = bw * 185 / 360, P = w * 0.66, RIM = 0.57;
  const bedTop = Math.max(0, P * 0.88 - bh * 0.5), stageH = bedTop + bh * 0.76;
  const h = Math.max(150, w * 1.42);
  return (
    <Press onPress={() => onPress(ref.current)} style={[styles.bed, { width: w, height: h }, selected && styles.bedSel]}
      accessibilityRole="button" accessibilityLabel={t("gd.bedLabel", { i: i + 1, what: `${b.flower ? FLOWER_BY_ID[b.flower].name + ", " : ""}${st.text}` })}>
      <View ref={ref} collapsable={false} style={{ flex: 1, alignItems: "center" }}>
        {/* plant stands IN the bed: bed → plant → the bed's front rim drawn again over the stem */}
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: bw, height: stageH }}>
            <Image source={bedSrc} resizeMode="stretch" style={{ position: "absolute", left: 0, top: bedTop, width: bw, height: bh }} />
            {img ? (
              <Animated.Image source={img} resizeMode="contain" style={{
                position: "absolute", left: (bw - P) / 2, top: bedTop + bh * 0.5 + P * 0.12 - P, width: P, height: P, transformOrigin: "50% 88%",
                transform: [{ scale: pop }, { rotate: sway.interpolate(sinDeg(2.5)) }],
              }} />
            ) : (
              <View style={[styles.plus, { position: "absolute", left: bw / 2 - 20, top: bedTop + bh * 0.42 - 40 }]}><Image source={ART.seed} style={{ width: 20, height: 20, tintColor: "#fff" }} /></View>
            )}
            <View pointerEvents="none" style={{ position: "absolute", left: 0, top: bedTop + bh * RIM, width: bw, height: bh * (1 - RIM), overflow: "hidden" }}>
              <Image source={bedSrc} resizeMode="stretch" style={{ position: "absolute", left: 0, top: -bh * RIM, width: bw, height: bh }} />
            </View>
          </View>
        </View>
        <Txt v="tiny" center numberOfLines={1} color="#3E2A12" style={{ marginTop: 2 }}>{b.flower ? FLOWER_BY_ID[b.flower].name : t("gd.emptyBed")}</Txt>
        {b.flower && !isReady(b) ? <Bar progress={progress(b)} height={6} color={wet ? "#4AA8EE" : C.honey} track="#EADBC0" style={{ width: "86%", marginTop: 4 }} /> : <View style={{ height: 10 }} />}
        <View style={[styles.status, styles.chip, { backgroundColor: TONE_BG[chip.tone] }]}>
          <Image source={chip.icon} style={{ width: 14, height: 14, tintColor: chip.tint }} />
          <Txt v="tiny" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} color={TONE[chip.tone]} style={{ fontWeight: "900" }}>{chip.text}</Txt>
        </View>
        {st.tone === "ready" ? <View style={styles.readyDot}><Image source={ART.nectar} style={{ width: 22, height: 22 }} /></View> : null}
        {st.tone === "dry" ? <View style={[styles.readyDot, { backgroundColor: "#DDF0FF" }]}><Image source={ART.can} style={{ width: 18, height: 18, tintColor: "#3B8FD6" }} /></View> : null}
      </View>
    </Press>
  );
}

export default function GardenScreen({ s, now, onPlant, onWater, onWaterAll, onHarvest, onUnlockBed, onIntroDone, onToggleDeco, onShop }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const { width: winW } = useWindowDimensions();
  const [gridW, setGridW] = useState(Math.min(winW, 520) - 32);
  const COLS = 3, GAP = 8;
  const bw = Math.max(1, Math.floor((gridW - GAP * (COLS - 1)) / COLS) - 1);
  const beds = s.garden.beds;
  const dc = dayColorInfo(s, now);
  const dcFlower = FLOWERS.find((f) => f.color === dc.color)!;
  const canWaterAny = beds.some(canWater);
  const bonus = Math.round(BED_HIVE_BONUS * 100 * beds.filter((b) => b.flower).length);
  const bedCost = nextBedCost(s);
  const selBed = sel !== null ? beds[sel] : null;

  const tap = async (i: number, ref: View | null) => {
    const b = beds[i];
    if (isReady(b)) { onHarvest(i, await centerOf(ref)); setSel(null); return; }
    setSel(sel === i ? null : i);
  };

  const top = useTopPad();
  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + top, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
      {!s.settings.gardenIntroDone ? (
        <Card style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Mascot id="zhuzha" size={78} seed={11} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t("gd.introTitle")}</Txt>
            <Txt v="small" color={C.dim}>{t("gd.introText")}</Txt>
            <GameButton small title={t("gd.gotIt")} color="green" onPress={onIntroDone} style={{ marginTop: 8, alignSelf: "flex-start", minWidth: 120 }} />
          </View>
        </Card>
      ) : null}

      <View style={[styles.head, shadow]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color="#4E7A2A">{t("gd.caps")}</Txt>
            <Txt v="h2" color="#2F4A17">{t("gd.beds", { a: beds.length, b: MAX_BEDS })}</Txt>
            <Txt v="small" color="#4E7A2A">{t("gd.bonus", { p: Math.round(BED_HIVE_BONUS * 100) })}{bonus ? t("gd.bonusNow", { p: bonus }) : ""}</Txt>
          </View>
        </View>
        <View style={[styles.dayColor, { borderColor: COLOR_HEX[dc.color] }]}>
          <Image source={ART.cells[dc.color]} style={styles.glyphBig} />
          <Txt v="small" color={C.text} style={{ flex: 1 }}>
            {t("gd.dayColor", { color: colorName(dc.color) })}{dc.active ? t("gd.dayColorOn") : t("gd.dayColorPlant", { flower: dcFlower.name })}
          </Txt>
        </View>
      </View>

      {/* decorations stand on the grass between the sign and the beds */}
      <View style={{ height: 96, marginTop: -4 }}>
        <DecorSpots s={s} place="garden" spots={GARDEN_SPOTS} w={gridW} h={96} onToggle={onToggleDeco} onShop={onShop} />
      </View>

      <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP, width: "100%", alignSelf: "stretch" }}>
        {beds.map((b, i) => <BedTile key={i} b={b} i={i} w={bw} selected={sel === i} onPress={(r) => tap(i, r)} />)}
        {Array.from({ length: MAX_BEDS - beds.length }, (_, k) => {
          const next = k === 0 && bedCost !== null;
          return (
            <Press key={`l${k}`} disabled={!next} onPress={() => onUnlockBed()} style={[styles.bed, styles.bedPlot, { width: bw, height: Math.max(150, bw * 1.42), opacity: next ? 1 : 0.55 }]}
              accessibilityRole="button" accessibilityLabel={next ? t("gd.newBedLabel", { n: bedCost }) : t("gd.newBedCaps")}>
              <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", width: "100%" }}>
                <Image source={ART.shovel} style={{ width: 30, height: 30, opacity: 0.8, marginBottom: 6 }} />
              </View>
              <Image source={require("../../assets/art/env/bed_dry.webp")} resizeMode="contain" style={{ width: "100%", height: bw * 0.32, marginTop: -bw * 0.1, opacity: 0.45 }} />
              <Txt v="tiny" color="#6E5232" style={{ marginTop: 2 }}>{t("gd.newBedCaps")}</Txt>
              {next ? (
                <View style={[styles.status, { backgroundColor: s.honey >= (bedCost ?? 0) ? "#FFF0C9" : "#F6ECD8", flexDirection: "row", gap: 3, marginTop: 14 }]}>
                  <Image source={ART.honey} style={{ width: 14, height: 14 }} />
                  <Txt v="tiny" color={s.honey >= (bedCost ?? 0) ? C.honeyDark : "#8A6A48"} style={{ fontWeight: "900" }}>{fmt(bedCost ?? 0)}</Txt>
                </View>
              ) : <View style={{ height: 34 }} />}
            </Press>
          );
        })}
      </View>

      <GameButton title={t("gd.waterAll")} icon={ART.can} color="green" disabled={!canWaterAny} onPress={() => onWaterAll()} label={t("gd.waterAll")} />
      <View style={styles.hint}><Txt v="small" color="#4A3218" center>{t("gd.tapHint")}</Txt></View>
      <View style={styles.hint}><Txt v="tiny" color="#5E4426" center>{t("gd.levelHint", { n: level(s) })}</Txt></View>
    </ScrollView>
    <Overlay visible={selBed !== null} onClose={() => setSel(null)}>
      <CloseBtn onPress={() => setSel(null)} />
      {selBed && sel !== null ? (
        selBed.flower ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 40 }}>
              <Image source={GARDEN_ART[`${selBed.flower}_bloom`]} style={{ width: 64, height: 64 }} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{FLOWER_BY_ID[selBed.flower].name}</Txt>
                <Txt v="small" color={C.dim}>{t("gd.harvestInfo", { status: bedStatus(selBed).text, n: FLOWER_BY_ID[selBed.flower].nectar })}</Txt>
                <Txt v="small" color={C.dim}>{t("gd.wetOnly", { n: WATER_HOURS })}</Txt>
              </View>
            </View>
            <GameButton small title={canWater(selBed) ? t("gd.water") : t("gd.stillWet")} icon={ART.can} color="green" disabled={!canWater(selBed)}
              onPress={() => { if (onWater(sel)) setSel(null); }} style={{ marginTop: 10 }} label={t("gd.waterBed")} />
          </View>
        ) : (
          <View>
            <Txt v="h2" style={{ marginBottom: 10, marginRight: 40 }}>{t("gd.whatPlant")}</Txt>
            {FLOWERS.filter((f) => !f.rare || seedsOwned(s, f.id) > 0).map((f) => {
              const pocket = seedsOwned(s, f.id);
              const unlocked = pocket > 0 || flowerUnlocked(s, f.id);
              const price = seedPrice(s, f.id);
              return (
                <View key={f.id} style={[styles.seedRow, !unlocked && { opacity: 0.6 }]}>
                  <Image source={GARDEN_ART[`${f.id}_bloom`]} style={{ width: 50, height: 50, opacity: unlocked ? 1 : 0.5 }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Image source={ART.cells[f.color]} style={styles.glyph} accessibilityLabel={colorName(f.color)} />
                      <Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }} color={f.rare ? RARITY_UI.rare.color : undefined}>{f.name}</Txt>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <View style={styles.fact}><Txt v="tiny" color="#6E5232">⏱ {t("gd.hours", { h: f.growHours })}</Txt></View>
                      <View style={styles.fact}><Image source={ART.nectar} style={{ width: 14, height: 14 }} /><Txt v="tiny" color="#6E5232">+{f.nectar}</Txt></View>
                      {pocket ? <View style={styles.fact}><Image source={ART.seed} style={{ width: 14, height: 14 }} /><Txt v="tiny" color="#6E5232">×{pocket}</Txt></View> : null}
                    </View>
                  </View>
                  {pocket > 0 ? (
                    <GameButton small title={t("gd.free")} icon={ART.seed} color="green" onPress={() => { if (onPlant(sel, f.id)) setSel(null); }}
                      label={t("gd.plantPocket", { name: f.name })} style={styles.seedBtn} />
                  ) : unlocked ? (
                    <GameButton small title={fmt(price)} icon={ART.honey} disabled={s.honey < price} onPress={() => { if (onPlant(sel, f.id)) setSel(null); }}
                      label={t("gd.plant", { name: f.name })} style={styles.seedBtn} />
                  ) : <Txt v="tiny" color={C.dim} center style={styles.seedBtn}>{t("gd.fromLevel", { n: f.minLevel })}</Txt>}
                </View>
              );
            })}
          </View>
        )
      ) : null}
    </Overlay>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: "rgba(255,250,238,0.94)", borderRadius: 24, padding: 14 },
  nectarBox: { alignItems: "center", backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  dayColor: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, padding: 10, marginTop: 12, borderWidth: 2 },
  bed: { backgroundColor: "rgba(255,250,236,0.78)", borderRadius: 20, padding: 6, paddingBottom: 8, alignItems: "center", overflow: "visible", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  bedPlot: { backgroundColor: "rgba(255,250,236,0.45)", borderStyle: "dashed", borderColor: "rgba(160,120,60,0.45)" },
  chip: { flexDirection: "row", gap: 3 },
  status: { marginTop: 5, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, maxWidth: "100%", alignItems: "center" },
  hint: { alignSelf: "center", backgroundColor: "rgba(255,250,236,0.88)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  decoSpot: { width: 92, height: 56, borderRadius: 46, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  bedSel: { borderWidth: 3, borderColor: C.honey, padding: 5, backgroundColor: "rgba(255,247,226,0.6)" },
  bedLocked: { backgroundColor: "#F6EAD3", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#E2C99C", ...shadow, shadowOpacity: 0 },
  soil: { width: "92%", height: 18, borderRadius: 9, backgroundColor: "#B07A4A", overflow: "hidden" },
  soilWet: { backgroundColor: "#7A4E2B" },
  soilRidge: { position: "absolute", left: 6, right: 6, top: 3, height: 4, borderRadius: 2, backgroundColor: "#C9935F" },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7CBF4E", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  readyDot: { position: "absolute", top: -6, right: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE3EE", alignItems: "center", justifyContent: "center" },
  cost: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, marginBottom: 6, borderRadius: 16, backgroundColor: "#FFF8EA", borderWidth: 1.5, borderColor: C.line },
  seedBtn: { width: 92 },
  fact: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F3E6CC", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  glyph: { width: 22, height: 19 },
  glyphBig: { width: 28, height: 24 },
});
