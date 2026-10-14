import { t } from "../i18n";
import { shownDecos } from "../logic/game";
import { DecoStrip } from "../ui/lootUi";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GameState, cap, canBuildAt, clockRolledBack, combActionCost, level, rate, upgradeCostFor } from "../logic/game";
import { capHours, combRate, MAX_COMB_LEVEL, msUntilFull, UPGRADES, UpgradeId } from "../logic/economy";
import { HIVE_SLOTS, hiveCenter } from "../logic/hex";
import { boostsFor } from "../logic/bees";
import { ART } from "../ui/art";
import { BeeSprite } from "../ui/BeeSprite";
import { sinRange, useAnimActive, useCycle } from "../ui/anim";
import { buildFlight } from "../logic/flight";
import { C, F, shadow } from "../ui/theme";
import { Bar, Card, CloseBtn, fmt, GameButton, Overlay, Press, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration, rateFmt } from "../ui/format";

const SQ3 = Math.sqrt(3);
const UP_ICON: Record<UpgradeId, React.ReactNode> = {
  workers: <BeeSprite id="zhuzha" size={44} flap={false} />,
  storage: <Image source={ART.honey} style={{ width: 40, height: 40 }} />,
  flowers: <Image source={ART.cells[2]} style={{ width: 40, height: 40 }} />,
  queen: <BeeSprite id="margo" size={44} flap={false} />,
};

interface Props {
  s: GameState;
  now: number;
  onCollect: (from: Pt | null) => void;
  onComb: (slot: number) => boolean;
  onUpgrade: (id: UpgradeId) => boolean;
  banner?: React.ReactNode;
  /** bumps on every honey collect: hive bees hop and spin */
  cheer?: number;
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
      accessibilityLabel={state === "built" ? t("hive.combLabel", { slot: slot + 1, lvl }) : state === "open" ? t("hive.emptyLabel", { slot: slot + 1 }) : t("hive.lockedLabel", { slot: slot + 1 })}
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
      </Animated.View>
      {plus ? (
        <Animated.View pointerEvents="none" style={{
          position: "absolute", left: 0, right: 0, top: -6, alignItems: "center",
          opacity: fl.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: fl.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
        }}>
          <Text style={[F.black, styles.lvlText, { fontSize: 18, color: C.green }]}>{lvl === 1 ? t("hive.built") : t("hive.plusLvl")}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

/** A bee flying a pre-computed curved loop around the hive, sometimes landing on a comb to work. */
function HiveBee({ id, seed, w, h, size, land, cheer, on, level, skin }: {
  id: string; seed: number; w: number; h: number; size: number; land: Pt | null; cheer: number; on: boolean; level: number; skin?: string;
}) {
  const path = useMemo(() => buildFlight({ w, h, seed, land, margin: size * 0.45, speed: 70 + (seed % 5) * 9 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, h, seed, size, land?.x, land?.y]);
  const v = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  useCycle(v, path.duration, on, (seed % 997) / 997);
  useCycle(bob, 780 + (seed % 7) * 70, on, (seed % 13) / 13);
  const firstCheer = useRef(cheer);
  useEffect(() => {
    if (cheer === firstCheer.current) return;
    hop.setValue(0);
    const a = Animated.timing(hop, { toValue: 1, duration: 950, delay: (seed % 6) * 70, easing: Easing.out(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [cheer, hop, seed]);
  const anim = useMemo(() => {
    const t = path.t;
    const half = size / 2;
    const rest = v.interpolate({ inputRange: t, outputRange: path.rest });
    const flip = v.interpolate({ inputRange: t, outputRange: path.flip });
    return {
      x: v.interpolate({ inputRange: t, outputRange: path.x.map((p) => p - half) }),
      y: v.interpolate({ inputRange: t, outputRange: path.y.map((p) => p - half) }),
      rot: v.interpolate({ inputRange: t, outputRange: path.rot.map((r) => `${r}deg`) }),
      turn: v.interpolate({ inputRange: t, outputRange: path.yaw }),
      bobY: Animated.multiply(bob.interpolate(sinRange(size * 0.07)), Animated.subtract(1, rest)),
      rest,
      look: flip.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.035, size * 0.035] }),
      hopY: hop.interpolate({ inputRange: [0, 0.3, 0.55, 0.8, 1], outputRange: [0, -size * 0.55, -size * 0.1, -size * 0.25, 0] }),
      spin: hop.interpolate({ inputRange: [0, 0.55, 1], outputRange: ["0deg", "360deg", "360deg"] }),
      pop: hop.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [1, 1.25, 0.95, 1] }),
    };
  }, [path, v, bob, hop, size]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: 0, top: 0, width: size, height: size,
      transform: [
        { translateX: anim.x }, { translateY: anim.y }, { translateY: anim.bobY }, { translateY: anim.hopY },
        { rotate: anim.rot }, { rotate: anim.spin }, { scale: anim.pop },
      ],
    }}>
      <BeeSprite id={id} size={size} seed={seed} rest={anim.rest} face={{ lookX: anim.look }} turn={anim.turn} level={level} skin={skin} />
    </Animated.View>
  );
}

const hash = (str: string, i: number) => { let x = 2166136261 ^ i; for (let k = 0; k < str.length; k++) x = Math.imul(x ^ str.charCodeAt(k), 16777619); return (x >>> 0) % 100000 + 1; };

export default function HiveScreen({ s, now, onCollect, onComb, onUpgrade, banner, cheer = 0 }: Props) {
  const [containerW, setContainerW] = useState(360);
  const [sel, setSel] = useState<number | null>(null);
  const collectRef = useRef<View>(null);
  const areaW = Math.max(1, Math.min(containerW, 520) - 32);
  const hs = Math.min(areaW / 10.2, 40);
  const areaH = SQ3 * hs * 5 + 24;
  const r = rate(s), c = cap(s);
  const hours = capHours(s.upgrades.storage, boostsFor(s.bees, s.beeLevels).capHours);
  const full = msUntilFull(s.hive, r, hours);
  const stored = Math.floor(s.hive.stored);
  const isFull = stored >= c && c > 0;
  const rolled = clockRolledBack(s, now);

  const glow = useRef(new Animated.Value(0)).current;
  const [showUp, setShowUp] = useState(false);
  const activeNow = useAnimActive();
  useCycle(glow, 1200, isFull && activeNow);
  useEffect(() => { if (!isFull) glow.setValue(0); }, [isFull, glow]);

  const tiles = useMemo(() => HIVE_SLOTS.map((p, i) => {
    const { x, y } = hiveCenter(p.q, p.r, hs);
    const lvl = s.hive.combs[i];
    const st: "built" | "open" | "locked" = lvl > 0 ? "built" : canBuildAt(s, i) ? "open" : "locked";
    return { i, x: x + areaW / 2, y: y + areaH / 2, lvl, st };
  }), [s, hs, areaW, areaH]);

  const act = activeNow;
  const beeSize = Math.round(Math.max(34, Math.min(46, hs * 0.95)));
  const builtKey = tiles.filter((t) => t.st === "built").map((t) => t.i).join(",");
  const flyers = useMemo(() => {
    const owned = s.bees.length ? s.bees : ["zhuzha"];
    const built = tiles.filter((t) => t.st === "built");
    // web (Telegram) animates on the JS thread: fewer bees keep it smooth on mid-range phones
    const n = Math.min(Platform.OS === "web" ? 4 : 8, Math.max(3, built.length + 1));
    // land on distinct built combs, spread over the hive
    const order = built.map((t, k) => ({ t, h: hash("comb", t.i * 31 + k) })).sort((a, b) => a.h - b.h).map((o) => o.t);
    let li = 0;
    return Array.from({ length: n }, (_, i) => {
      const id = owned[i % owned.length];
      const seed = hash(id, i);
      const comb = i % 2 === 1 && li < order.length ? order[li++] : null;
      return { key: `${id}-${i}`, id, seed, land: comb ? { x: comb.x, y: comb.y - hs * 0.25 } : null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.bees.join(","), builtKey, hs, areaW, areaH]);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
      {rolled ? (
        <Card style={{ backgroundColor: "#FFE7DF", padding: 12 }}>
          <Txt v="small" color={C.red}>{t("hive.rollback")}</Txt>
        </Card>
      ) : null}

      {banner}
      {/* hive: free-standing comb field on the meadow */}
      <View style={[styles.hiveArea, { height: areaH + 46 }]}>
        <View style={styles.hiveHead}>
          <View style={styles.levelChip}><Txt v="small" color="#fff">{t("hive.levelChip", { n: level(s) })}</Txt></View>
          <Txt v="small" color={C.honeyDark}>{t("hive.rate", { r: rateFmt(r) })}</Txt>
        </View>
        <Pressable style={{ width: areaW, height: areaH }} onPress={() => setSel(null)} accessibilityLabel={t("hive.label")}>
          {tiles.map((t) => (
            <CombTile key={t.i} slot={t.i} lvl={t.lvl} x={t.x} y={t.y} s={hs} state={t.st} selected={sel === t.i}
              onPress={() => setSel(sel === t.i ? null : t.i)} />
          ))}
          {flyers.map((b) => <HiveBee key={b.key} id={b.id} seed={b.seed} w={areaW} h={areaH} size={beeSize} land={b.land} cheer={cheer} on={act} level={s.beeLevels[b.id] ?? 1} skin={s.beeSkins[b.id]} />)}
        </Pressable>
      </View>

      {/* selected comb or storage */}
      {sel !== null ? (
        <CombPanel s={s} slot={sel} onAction={() => onComb(sel)} onClose={() => setSel(null)} />
      ) : null}

      <View style={{ alignItems: "center", gap: 6 }}>
        <View ref={collectRef} collapsable={false}>
          <GameButton
            title={stored >= 1 ? t("hive.collectN", { n: fmt(stored) }) : t("hive.empty")}
            icon={ART.honey}
            disabled={stored < 1}
            onPress={async () => onCollect(await centerOf(collectRef.current))}
            label={t("hive.collect")}
            style={{ minWidth: 220 }}
          />
        </View>
        <View style={styles.storeChip}>
          <Txt v="tiny" color={isFull ? C.red : C.honeyDark}>{isFull ? t("hive.full") : t("hive.stored")} · {fmt(stored)} / {fmt(c)}{!isFull && full > 0 ? ` · ${duration(full)}` : ""}</Txt>
        </View>
      </View>
      {/* decor spots on the grass */}
      <View style={styles.decoGrass}>
        <DecoStrip ids={shownDecos(s, "hive")} ground="transparent" />
        <View style={styles.decoSpot}><Txt v="h3" color="#fff">+</Txt><Txt v="tiny" color="#fff">{t("hv.decor")}</Txt></View>
      </View>

      <GameButton title={t("hive.upgrades")} color="white" icon={ART.honey} onPress={() => setShowUp(true)} label={t("hive.upgrades")} style={{ alignSelf: "center", minWidth: 200 }} />
    </ScrollView>
    <Overlay visible={showUp} onClose={() => setShowUp(false)}>
      <CloseBtn onPress={() => setShowUp(false)} />
      <Txt v="h2" style={{ marginBottom: 10 }}>{t("hive.upgrades")}</Txt>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
      {UPGRADES.map((u) => {
        const lvl = s.upgrades[u.id];
        const cost = upgradeCostFor(s, u.id);
        return (
          <Card key={u.id} style={{ padding: 12 }}>
            <Txt v="h3" style={{ fontSize: 16, marginBottom: 8 }}>{u.name}</Txt>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={styles.upIcon}>{UP_ICON[u.id]}</View>
            <View style={{ flex: 1 }}>
              <Txt v="tiny" color={C.honeyDark}>{t("hive.upLevel", { l: lvl, max: u.max })}</Txt>
              <Txt v="small" color={C.dim}>{cost !== null ? t("hive.next", { d: u.desc(lvl + 1) }) : u.desc(lvl)}</Txt>
            </View>
            {cost !== null ? (
              <GameButton small title={fmt(cost)} icon={ART.honey} disabled={s.honey < cost} onPress={() => onUpgrade(u.id)} label={t("hive.buy", { name: u.name })} style={{ width: 88, minWidth: 0 }} />
            ) : <Txt v="small" color={C.green}>{t("c.max")}</Txt>}
            </View>
          </Card>
        );
      })}
      </ScrollView>
    </Overlay>
    </View>
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
        <Txt v="h3" style={{ flex: 1 }}>{lvl > 0 ? t("hive.combTitle", { n: lvl }) : locked ? t("hive.lockedCell") : t("hive.emptyCell")}</Txt>
        <Press onPress={onClose} hitSlop={10} accessibilityLabel={t("hive.deselect")}><Image source={ART.close} style={{ width: 14, height: 14, tintColor: C.dim }} /></Press>
      </View>
      <Txt v="small" color={C.dim} style={{ marginTop: 4, marginBottom: 10 }}>
        {locked ? t("hive.growsFromCenter")
          : lvl >= MAX_COMB_LEVEL ? t("hive.maxRate", { r: rateFmt(now) })
          : lvl > 0 ? t("hive.rateUp", { a: rateFmt(now), b: rateFmt(next) }) : t("hive.newComb", { r: rateFmt(next) })}
      </Txt>
      {!locked && cost !== null ? (
        <GameButton
          title={lvl > 0 ? t("hive.upgradeCost", { c: fmt(cost) }) : t("hive.buildCost", { c: fmt(cost) })}
          icon={ART.honey}
          color="green"
          disabled={s.honey < cost}
          sub={s.honey < cost ? t("c.short", { n: fmt(cost - s.honey) }) : undefined}
          onPress={onAction}
          label={lvl > 0 ? t("hive.upgradeLabel") : t("hive.buildLabel")}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hiveArea: { alignItems: "center", paddingTop: 4, overflow: "hidden" },
  storeChip: { backgroundColor: "rgba(255,250,235,0.85)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  decoGrass: { flexDirection: "row", alignItems: "flex-end", minHeight: 90 },
  decoSpot: { width: 92, height: 56, borderRadius: 46, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginLeft: 8 },
  hiveHead: { flexDirection: "row", alignSelf: "stretch", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, height: 34 },
  levelChip: { backgroundColor: C.honeyDeep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  lvlCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  lvlText: { color: "#7A4300", textShadowColor: "rgba(255,255,255,0.8)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  upRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  upIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FFF3D6", alignItems: "center", justifyContent: "center" },
});
