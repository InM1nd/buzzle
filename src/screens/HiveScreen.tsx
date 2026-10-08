import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GameState, cap, canBuildAt, clockRolledBack, combActionCost, level, rate, upgradeCostFor } from "../logic/game";
import { capHours, combRate, MAX_COMB_LEVEL, msUntilFull, UPGRADES, UpgradeId } from "../logic/economy";
import { HIVE_SLOTS, hiveCenter } from "../logic/hex";
import { boostsFor } from "../logic/bees";
import { ART, BEE_ART } from "../ui/art";
import { C, F, shadow } from "../ui/theme";
import { Bar, Bobbing, Card, fmt, GameButton, Press, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration, rateFmt } from "../ui/format";

const SQ3 = Math.sqrt(3);
const UP_ICON: Record<UpgradeId, number> = { workers: BEE_ART.zhuzha, storage: ART.honey, flowers: ART.cells[2], queen: BEE_ART.margo };

interface Props {
  s: GameState;
  now: number;
  onCollect: (from: Pt | null) => void;
  onComb: (slot: number) => boolean;
  onUpgrade: (id: UpgradeId) => boolean;
  banner?: React.ReactNode;
}

function CombTile({ slot, lvl, x, y, s, state, selected, onPress }: {
  slot: number; lvl: number; x: number; y: number; s: number; state: "built" | "open" | "locked"; selected: boolean; onPress: () => void;
}) {
  const sc = useRef(new Animated.Value(1)).current;
  const prev = useRef(lvl);
  const [plus, setPlus] = useState(0);
  const fl = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (lvl > prev.current) {
      sc.setValue(0.7);
      Animated.spring(sc, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 12 }).start();
      setPlus((p) => p + 1);
      fl.setValue(0);
      Animated.timing(fl, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
    }
    prev.current = lvl;
  }, [lvl, sc, fl]);
  const w = 2 * s * 0.96, h = SQ3 * s * 0.96;
  const src = state === "built" ? ART.comb : state === "open" ? ART.combEmpty : ART.combLocked;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={state === "built" ? `Сота ${slot + 1}, уровень ${lvl}` : state === "open" ? `Пустая ячейка ${slot + 1}` : `Закрытая ячейка ${slot + 1}`}
      style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h }}
    >
      <Animated.View style={{ width: w, height: h, opacity: state === "locked" ? 0.45 : 1, transform: [{ scale: Animated.multiply(sc, selected ? 1.08 : 1) }] }}>
        <Image source={src} style={{ width: w, height: h }} />
        {state === "built" ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.lvlCenter}><Text style={[F.black, styles.lvlText, { fontSize: s * 0.5 }]}>{lvl}</Text></View>
          </View>
        ) : state === "open" ? (
          <View style={[StyleSheet.absoluteFill, styles.lvlCenter]} pointerEvents="none">
            <Text style={[F.black, { fontSize: s * 0.7, color: "#D9A54C", lineHeight: s * 0.8 }]}>+</Text>
          </View>
        ) : null}
        {selected ? <Image source={ART.ring} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} /> : null}
      </Animated.View>
      {plus ? (
        <Animated.View pointerEvents="none" style={{
          position: "absolute", left: 0, right: 0, top: -6, alignItems: "center",
          opacity: fl.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: fl.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
        }}>
          <Text style={[F.black, styles.lvlText, { fontSize: 18, color: C.green }]}>{lvl === 1 ? "Построено!" : "+1 ур."}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

function FlyingBee({ id, i, w, h }: { id: string; i: number; w: number; h: number }) {
  const a = useRef(new Animated.Value(0)).current;
  const spots = [[0.1, 0.12], [0.86, 0.18], [0.08, 0.78], [0.88, 0.8], [0.5, 0.02], [0.5, 0.9]];
  const [sx, sy] = spots[i % spots.length];
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 2600 + i * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 2600 + i * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [a, i]);
  const size = 46;
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: sx * w - size / 2, top: sy * h - size / 2,
      transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] }) }, { scaleX: a.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, -1, -1] }) }],
    }}>
      <Bobbing amp={4} period={1200 + i * 170} delay={i * 90}>
        <Image source={BEE_ART[id]} style={{ width: size, height: size }} />
      </Bobbing>
    </Animated.View>
  );
}

export default function HiveScreen({ s, now, onCollect, onComb, onUpgrade, banner }: Props) {
  const { width } = useWindowDimensions();
  const [sel, setSel] = useState<number | null>(null);
  const collectRef = useRef<View>(null);
  const areaW = Math.min(width, 520) - 32;
  const hs = Math.min(areaW / 8.6, 48);
  const areaH = SQ3 * hs * 5 + 24;
  const r = rate(s), c = cap(s);
  const hours = capHours(s.upgrades.storage, boostsFor(s.bees).capHours);
  const full = msUntilFull(s.hive, r, hours);
  const stored = Math.floor(s.hive.stored);
  const isFull = stored >= c && c > 0;
  const rolled = clockRolledBack(s, now);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFull) { glow.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [isFull, glow]);

  const tiles = useMemo(() => HIVE_SLOTS.map((p, i) => {
    const { x, y } = hiveCenter(p.q, p.r, hs);
    const lvl = s.hive.combs[i];
    const st: "built" | "open" | "locked" = lvl > 0 ? "built" : canBuildAt(s, i) ? "open" : "locked";
    return { i, x: x + areaW / 2, y: y + areaH / 2, lvl, st };
  }), [s, hs, areaW, areaH]);

  const flyingBees = s.bees.slice(0, 6);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
      {rolled ? (
        <Card style={{ backgroundColor: "#FFE7DF", padding: 12 }}>
          <Txt v="small" color={C.red}>Часы устройства переведены назад. Пчёлы подождут, пока время снова догонит улей.</Txt>
        </Card>
      ) : null}

      {banner}
      {/* hive */}
      <View style={[styles.hiveArea, { height: areaH + 46 }]}>
        <View style={styles.hiveHead}>
          <View style={styles.levelChip}><Txt v="small" color="#fff">Улей · ур. {level(s)}</Txt></View>
          <Txt v="small" color={C.honeyDark}>+{rateFmt(r)} мёда/ч</Txt>
        </View>
        <Pressable style={{ width: areaW, height: areaH }} onPress={() => setSel(null)} accessibilityLabel="Улей">
          {tiles.map((t) => (
            <CombTile key={t.i} slot={t.i} lvl={t.lvl} x={t.x} y={t.y} s={hs} state={t.st} selected={sel === t.i}
              onPress={() => setSel(sel === t.i ? null : t.i)} />
          ))}
          {flyingBees.map((id, i) => <FlyingBee key={id} id={id} i={i} w={areaW} h={areaH} />)}
        </Pressable>
      </View>

      {/* selected comb or storage */}
      {sel !== null ? (
        <CombPanel s={s} slot={sel} onAction={() => onComb(sel)} onClose={() => setSel(null)} />
      ) : null}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Animated.Image source={ART.honey} style={{ width: 54, height: 54, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{isFull ? "Улей полон!" : "Мёд в улье"}</Txt>
            <Txt v="num" color={C.honeyDark}>{fmt(stored)} <Txt v="small" color={C.dim}>/ {fmt(c)}</Txt></Txt>
          </View>
        </View>
        <Bar progress={c ? stored / c : 0} height={14} style={{ marginTop: 10 }} color={isFull ? C.honeyDeep : C.honey} />
        <Txt v="small" color={C.dim} style={{ marginTop: 6 }}>
          {isFull ? "Пчёлы ждут — забери мёд, чтобы они продолжили работу." : full > 0 ? `Заполнится через ${duration(full)} · запас на ${hours} ч` : "Постройте соты, чтобы пчёлы начали работу."}
        </Txt>
        <View ref={collectRef} collapsable={false} style={{ marginTop: 12 }}>
          <GameButton
            title={stored >= 1 ? `Собрать ${fmt(stored)}` : "Пока пусто"}
            icon={ART.honey}
            disabled={stored < 1}
            onPress={async () => onCollect(await centerOf(collectRef.current))}
            label="Собрать мёд"
          />
        </View>
      </Card>

      {/* upgrades */}
      <Txt v="h2" style={{ marginTop: 4, marginLeft: 4 }}>Улучшения</Txt>
      {UPGRADES.map((u) => {
        const lvl = s.upgrades[u.id];
        const cost = upgradeCostFor(s, u.id);
        return (
          <Card key={u.id} style={styles.upRow}>
            <View style={styles.upIcon}><Image source={UP_ICON[u.id]} style={{ width: 40, height: 40 }} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3" numberOfLines={1}>{u.name}</Txt>
              <Txt v="tiny" color={C.honeyDark}>УРОВЕНЬ {lvl}/{u.max}</Txt>
              <Txt v="small" color={C.dim}>{cost !== null ? `дальше: ${u.desc(lvl + 1)}` : u.desc(lvl)}</Txt>
            </View>
            {cost !== null ? (
              <GameButton small title={fmt(cost)} icon={ART.honey} disabled={s.honey < cost} onPress={() => onUpgrade(u.id)} label={`Купить: ${u.name}`} style={{ minWidth: 96 }} />
            ) : <Txt v="small" color={C.green}>Макс.</Txt>}
          </Card>
        );
      })}
    </ScrollView>
  );
}

function CombPanel({ s, slot, onAction, onClose }: { s: GameState; slot: number; onAction: () => void; onClose: () => void }) {
  const lvl = s.hive.combs[slot];
  const cost = combActionCost(s, slot);
  const open = lvl === 0 && canBuildAt(s, slot);
  const locked = lvl === 0 && !open;
  const mult = rate(s) / Math.max(1e-9, s.hive.combs.reduce((a, l) => a + combRate(l), 0));
  const now = combRate(lvl) * (Number.isFinite(mult) && mult > 0 ? mult : 1);
  const next = combRate(lvl + 1) * (Number.isFinite(mult) && mult > 0 ? mult : 1);
  return (
    <Card warm style={{ borderWidth: 2, borderColor: C.honey }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Txt v="h3" style={{ flex: 1 }}>{lvl > 0 ? `Сота · уровень ${lvl}` : locked ? "Закрытая ячейка" : "Пустая ячейка"}</Txt>
        <Press onPress={onClose} hitSlop={10} accessibilityLabel="Снять выбор"><Image source={ART.close} style={{ width: 14, height: 14, tintColor: C.dim }} /></Press>
      </View>
      <Txt v="small" color={C.dim} style={{ marginTop: 4, marginBottom: 10 }}>
        {locked ? "Улей растёт от центра: сначала постройте соседнюю соту."
          : lvl >= MAX_COMB_LEVEL ? `Максимальный уровень · ${rateFmt(now)} мёда/ч`
          : lvl > 0 ? `${rateFmt(now)} → ${rateFmt(next)} мёда в час` : `Новая сота: +${rateFmt(next)} мёда в час`}
      </Txt>
      {!locked && cost !== null ? (
        <GameButton
          title={lvl > 0 ? `Улучшить · ${fmt(cost)}` : `Построить · ${fmt(cost)}`}
          icon={ART.honey}
          color="green"
          disabled={s.honey < cost}
          sub={s.honey < cost ? `не хватает ${fmt(cost - s.honey)}` : undefined}
          onPress={onAction}
          label={lvl > 0 ? "Улучшить соту" : "Построить соту"}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hiveArea: { backgroundColor: "#FFE9BF", borderRadius: 28, alignItems: "center", paddingTop: 8, borderWidth: 3, borderColor: "#F6D594", ...shadow },
  hiveHead: { flexDirection: "row", alignSelf: "stretch", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, height: 34 },
  levelChip: { backgroundColor: C.honeyDeep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  lvlCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  lvlText: { color: "#7A4300", textShadowColor: "rgba(255,255,255,0.8)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  upRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  upIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FFF3D6", alignItems: "center", justifyContent: "center" },
});
