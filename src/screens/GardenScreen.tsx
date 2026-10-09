import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { GameState, dayColorInfo, flowerUnlocked, level, nextBedCost, seedPrice, seedsOwned, shownDecos } from "../logic/game";
import { DecoStrip, RARITY_UI } from "../ui/lootUi";
import {
  Bed, BED_HIVE_BONUS, canWater, FLOWER_BY_ID, FLOWERS, isReady, MAX_BEDS, progress, stageOf, WATER_HOURS,
} from "../logic/garden";
import { COLOR_NAMES } from "../logic/bees";
import { ART } from "../ui/art";
import { GARDEN_ART } from "../ui/beeArt";
import { Mascot } from "../ui/BeeSprite";
import { C, shadow } from "../ui/theme";
import { sinDeg, useAnimActive, useCycle } from "../ui/anim";
import { Bar, Card, fmt, GameButton, Press, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration } from "../ui/format";

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
}

function flowerImg(b: Bed) {
  const st = stageOf(b);
  if (st === "empty") return null;
  if (st === "sprout") return GARDEN_ART.sprout;
  return GARDEN_ART[`${b.flower}_${st}`];
}

export function bedStatus(b: Bed): { text: string; tone: "ok" | "dry" | "ready" | "empty" } {
  if (!b.flower) return { text: "Пустая грядка", tone: "empty" };
  if (isReady(b)) return { text: `Готово! +${FLOWER_BY_ID[b.flower].nectar}`, tone: "ready" };
  if (b.water <= 0) return { text: "Сухо — полей!", tone: "dry" };
  const need = FLOWER_BY_ID[b.flower].growHours - b.growth;
  if (b.water >= need - 1e-9) return { text: `Цветёт через ${duration(need * H)}`, tone: "ok" };
  return { text: `Вода ещё ${duration(b.water * H)}`, tone: "ok" };
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
  const wet = b.flower && b.water > 0 && !isReady(b);
  const img = flowerImg(b);
  const h = w * 1.18;
  return (
    <Press onPress={() => onPress(ref.current)} style={[styles.bed, shadow, { width: w, height: h }, selected && styles.bedSel]}
      accessibilityRole="button" accessibilityLabel={`Грядка ${i + 1}: ${b.flower ? FLOWER_BY_ID[b.flower].name + ", " : ""}${st.text}`}>
      <View ref={ref} collapsable={false} style={{ flex: 1, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" }}>
          {img ? (
            <Animated.Image source={img} style={{
              width: w * 0.92, height: w * 0.92, marginBottom: -w * 0.1,
              transform: [{ scale: pop }, { rotate: sway.interpolate(sinDeg(2.5)) }],
            }} />
          ) : (
            <View style={styles.plus}><Image source={ART.seed} style={{ width: 22, height: 22, tintColor: "#B0875A" }} /></View>
          )}
        </View>
        <View style={[styles.soil, wet ? styles.soilWet : null]}>
          <View style={[styles.soilRidge, wet ? { backgroundColor: "#6B4426" } : null]} />
        </View>
        {b.flower && !isReady(b) ? <Bar progress={progress(b)} height={6} color={wet ? "#5CB8F0" : C.honey} style={{ width: "86%", marginTop: 5 }} /> : <View style={{ height: 11 }} />}
        <Txt v="tiny" numberOfLines={1} color={st.tone === "ready" ? C.greenDark : st.tone === "dry" ? C.red : C.dim} style={{ marginTop: 3 }}>{st.text}</Txt>
        {st.tone === "ready" ? <View style={styles.readyDot}><Image source={ART.nectar} style={{ width: 22, height: 22 }} /></View> : null}
        {st.tone === "dry" ? <View style={[styles.readyDot, { backgroundColor: "#DDF0FF" }]}><Image source={ART.can} style={{ width: 18, height: 18, tintColor: "#3B8FD6" }} /></View> : null}
      </View>
    </Press>
  );
}

export default function GardenScreen({ s, now, onPlant, onWater, onWaterAll, onHarvest, onUnlockBed, onIntroDone }: Props) {
  const { width } = useWindowDimensions();
  const [sel, setSel] = useState<number | null>(null);
  const areaW = Math.min(width, 520) - 32;
  const bw = (areaW - 2 * 10) / 3;
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
      {!s.settings.gardenIntroDone ? (
        <Card style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Mascot id="zhuzha" size={78} seed={11} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">Новое: сад у улья!</Txt>
            <Txt v="small" color={C.dim}>Сажай цветы и поливай их раз в несколько часов. Цветы дают нектар — на него растут уровни пчёл.</Txt>
            <GameButton small title="Понятно" color="green" onPress={onIntroDone} style={{ marginTop: 8, alignSelf: "flex-start", minWidth: 120 }} />
          </View>
        </Card>
      ) : null}

      <View style={[styles.head, shadow]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color="#4E7A2A">САД У УЛЬЯ</Txt>
            <Txt v="h2" color="#2F4A17">Грядки {beds.length} из {MAX_BEDS}</Txt>
            <Txt v="small" color="#4E7A2A">Каждый цветок на грядке: +{Math.round(BED_HIVE_BONUS * 100)}% мёда улья{bonus ? ` · сейчас +${bonus}%` : ""}</Txt>
          </View>
          <View style={styles.nectarBox} accessibilityLabel={`Нектар ${Math.floor(s.nectar)}`}>
            <Image source={ART.nectar} style={{ width: 34, height: 34 }} />
            <Txt v="num" color="#B03A68">{fmt(s.nectar)}</Txt>
          </View>
        </View>
        <View style={[styles.dayColor, { borderColor: COLOR_HEX[dc.color] }]}>
          <View style={[styles.dot, { backgroundColor: COLOR_HEX[dc.color] }]} />
          <Txt v="small" color={C.text} style={{ flex: 1 }}>
            Цвет дня — {COLOR_NAMES[dc.color]} ×1,5 в головоломке. {dc.active ? "Включён: цветок уже растёт ✓" : `Посади: ${dcFlower.name}.`}
          </Txt>
        </View>
      </View>

      <DecoStrip ids={shownDecos(s, "garden")} ground="#DDEFC8" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {beds.map((b, i) => <BedTile key={i} b={b} i={i} w={bw} selected={sel === i} onPress={(r) => tap(i, r)} />)}
        {bedCost !== null ? (
          <Press onPress={() => onUnlockBed()} style={[styles.bed, styles.bedLocked, { width: bw, height: bw * 1.18 }]} accessibilityRole="button"
            accessibilityLabel={`Новая грядка за ${bedCost} мёда`}>
            <Image source={ART.shovel} style={{ width: 30, height: 30, tintColor: s.honey >= bedCost ? C.honeyDeep : "#CDB48C" }} />
            <Txt v="tiny" color={C.dim} style={{ marginTop: 6 }}>НОВАЯ ГРЯДКА</Txt>
            <View style={styles.cost}><Image source={ART.honey} style={{ width: 16, height: 16 }} /><Txt v="small" color={s.honey >= bedCost ? C.honeyDark : C.faint}>{fmt(bedCost)}</Txt></View>
          </Press>
        ) : null}
      </View>

      {canWaterAny ? (
        <GameButton title="Полить все грядки" icon={ART.can} color="white" onPress={() => onWaterAll()} label="Полить все грядки" />
      ) : null}

      {selBed && sel !== null ? (
        selBed.flower ? (
          <Card warm style={{ borderWidth: 2, borderColor: "#9FD07A" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image source={GARDEN_ART[`${selBed.flower}_bloom`]} style={{ width: 64, height: 64 }} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{FLOWER_BY_ID[selBed.flower].name}</Txt>
                <Txt v="small" color={C.dim}>{bedStatus(selBed).text} · урожай {FLOWER_BY_ID[selBed.flower].nectar} нектара</Txt>
                <Txt v="small" color={C.dim}>Растёт только во влажной земле: полив держится {WATER_HOURS} ч.</Txt>
              </View>
            </View>
            <GameButton small title={canWater(selBed) ? "Полить" : "Земля ещё влажная"} icon={ART.can} color="green" disabled={!canWater(selBed)}
              onPress={() => onWater(sel)} style={{ marginTop: 10 }} label="Полить грядку" />
          </Card>
        ) : (
          <Card warm style={{ borderWidth: 2, borderColor: C.honey }}>
            <Txt v="h3" style={{ marginBottom: 8 }}>Что посадим?</Txt>
            {FLOWERS.filter((f) => !f.rare || seedsOwned(s, f.id) > 0).map((f) => {
              const pocket = seedsOwned(s, f.id);
              const unlocked = pocket > 0 || flowerUnlocked(s, f.id);
              const price = seedPrice(s, f.id);
              return (
                <View key={f.id} style={styles.seedRow}>
                  <Image source={GARDEN_ART[`${f.id}_bloom`]} style={{ width: 52, height: 52, opacity: unlocked ? 1 : 0.4 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Txt v="h3" color={f.rare ? RARITY_UI.rare.color : undefined}>{f.name}</Txt>
                      <View style={[styles.dot, { backgroundColor: COLOR_HEX[f.color] }]} />
                    </View>
                    <Txt v="small" color={C.dim}>{f.growHours} ч роста · +{f.nectar} нектара{pocket ? ` · в кармане ×${pocket}` : ""}</Txt>
                  </View>
                  {pocket > 0 ? (
                    <GameButton small title="Даром" icon={ART.seed} color="green" onPress={() => { if (onPlant(sel, f.id)) setSel(null); }}
                      label={`Посадить из кармана: ${f.name}`} style={{ minWidth: 92 }} />
                  ) : unlocked ? (
                    <GameButton small title={fmt(price)} icon={ART.honey} disabled={s.honey < price} onPress={() => { if (onPlant(sel, f.id)) setSel(null); }}
                      label={`Посадить: ${f.name}`} style={{ minWidth: 92 }} />
                  ) : <Txt v="small" color={C.faint}>с {f.minLevel} ур. улья</Txt>}
                </View>
              );
            })}
          </Card>
        )
      ) : (
        <Txt v="small" color={C.dim} center>Нажми на грядку, чтобы посадить или полить цветок. Готовые цветы собираются одним касанием.</Txt>
      )}
      <Txt v="tiny" color={C.faint} center>Уровень улья {level(s)}: чем выше улей, тем больше видов семян.</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: "#E6F5D2", borderRadius: 24, padding: 16, borderWidth: 3, borderColor: "#C6E5A4" },
  nectarBox: { alignItems: "center", backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  dayColor: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, padding: 10, marginTop: 12, borderWidth: 2 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff" },
  bed: { backgroundColor: "#FFF4DD", borderRadius: 22, padding: 8, alignItems: "center", overflow: "visible" },
  bedSel: { borderWidth: 3, borderColor: C.honey, padding: 5 },
  bedLocked: { backgroundColor: "#F6EAD3", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#E2C99C", ...shadow, shadowOpacity: 0 },
  soil: { width: "92%", height: 18, borderRadius: 9, backgroundColor: "#B07A4A", overflow: "hidden" },
  soilWet: { backgroundColor: "#7A4E2B" },
  soilRidge: { position: "absolute", left: 6, right: 6, top: 3, height: 4, borderRadius: 2, backgroundColor: "#C9935F" },
  plus: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#F3E1C0", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  readyDot: { position: "absolute", top: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE3EE", alignItems: "center", justifyContent: "center" },
  cost: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line },
});
