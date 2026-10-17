/**
 * v1.6 Meadow mini-game «Ночной полёт». The world lives in a ref and is advanced by requestAnimationFrame;
 * sprites are fixed pools moved with Animated.Value.setValue (no React render per frame, which matters in the
 * Telegram webview). React state only changes for the score and the phase; the scene itself is a memo component that never
 * re-renders during a run (pickup kinds are stacked images switched by opacity, not by React state).
 * Every setValue goes through a change gate: on Android each call is a JS→native round trip, so only values that
 * actually changed are sent (pillar gaps, hidden slots, bat frames and pickup kinds change rarely).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Image, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { batY, FH, newWorld, step, STEM_W, World, Z } from "../logic/nightFlight";
import { changeGate, Gate } from "../logic/changeGate";
import { FlightReward } from "../logic/game";
import { addBackListener } from "../platform/back";
import { useInsets } from "../platform/insets";
import { ART } from "../ui/art";
import { BeeSprite } from "../ui/BeeSprite";
import { CountUp, GameButton, Overlay, Press, Txt } from "../ui/components";
import { hError, hLight, hSuccess } from "../ui/haptics";
import { C, F, shadow, K, themed, isNight } from "../ui/theme";
import { USE_NATIVE_DRIVER } from "../ui/anim";

/* eslint-disable @typescript-eslint/no-require-imports */
const FA = {
  sky: require("../../assets/art/halloween/fl_sky.webp"),
  far: require("../../assets/art/halloween/fl_far.webp"),
  near: require("../../assets/art/halloween/fl_near.webp"),
  stemTop: require("../../assets/art/halloween/fl_stem_top.webp"),
  stemBottom: require("../../assets/art/halloween/fl_stem_bottom.webp"),
  bats: [require("../../assets/art/halloween/fl_bat_1.webp"), require("../../assets/art/halloween/fl_bat_2.webp"), require("../../assets/art/halloween/fl_bat_3.webp")],
  picks: [require("../../assets/art/halloween/fl_candy_1.webp"), require("../../assets/art/halloween/fl_candy_2.webp"), require("../../assets/art/halloween/fl_candy_3.webp"), require("../../assets/art/halloween/fl_firefly.webp")],
  lantern: require("../../assets/art/halloween/lantern_side_288.webp"),
  glow: require("../../assets/art/halloween/fl_glow.webp"),
};
const STEMS = 6, PICKS = 8, BATS = 3, BEE = 150 * Z, BAT = 150 * Z, CANDY = 92 * Z, FIREFLY = 64 * Z, GLOW = 540 * Z;
const STEM_H = STEM_W * 900 / 200; // stem art keeps its 200×900 aspect
/** parallax strips (only their painted bottom part, see scripts/import_halloween_art.py): a 16:9 tile drawn at BG_SCALE of
 *  the screen height and anchored to the bottom; top = where the strip starts in the tile. The sky drifts slowly behind. */
const SKY_F = 0.06;
const BG_SCALE = 0.8;
const LAYERS: { name: "far" | "near"; f: number; top: number }[] = [{ name: "far", f: 0.25, top: 594 / 900 }, { name: "near", f: 1, top: 702 / 900 }];
const OFF = -99999;

interface Props {
  beeId: string; skin?: string; level: number; best: number; paidLeft: number; event: boolean; seed: number;
  onFinish: (r: { passed: number; candies: number }) => FlightReward;
  onExit: () => void; onReplay: () => void;
}
type Phase = "ready" | "run" | "paused" | "over";

/** sprite values live on the native side: a per-frame setValue on a native node is one cheap call to the UI thread,
 *  while a JS-driven value re-applies the view props through React Native on every frame (that was the low FPS on
 *  Android; the puzzle animates natively and stays smooth). A zero-length native timing moves the node to native. */
const nv = (v0: number) => {
  const v = new Animated.Value(v0);
  if (USE_NATIVE_DRIVER) Animated.timing(v, { toValue: v0, duration: 0, useNativeDriver: true }).start();
  return v;
};
/** an animated value together with its change-gated setter */
interface Slot { v: Animated.Value; set: Gate }
const slot = (v0: number): Slot => { const v = nv(v0); return { v, set: changeGate(v0, (n) => v.setValue(n)) }; };
const aslot = () => slot(OFF);
const KINDS = 4; // 3 candies + firefly
interface Pool {
  layers: Slot[]; sky: Slot; beeY: Slot; beeRot: Slot;
  stems: { x: Slot; top: Slot; bot: Slot }[];
  picks: { x: Slot; y: Slot; o: Slot[]; kind: number }[];
  bats: { x: Slot; y: Slot; f: Slot[] }[];
}
const makePool = (): Pool => ({
  layers: LAYERS.map(() => slot(0)), sky: slot(0),
  beeY: slot(0), beeRot: slot(0),
  stems: Array.from({ length: STEMS }, () => ({ x: aslot(), top: aslot(), bot: aslot() })),
  picks: Array.from({ length: PICKS }, () => ({ x: aslot(), y: aslot(), o: Array.from({ length: KINDS }, () => slot(0)), kind: -1 })),
  bats: Array.from({ length: BATS }, () => ({ x: aslot(), y: aslot(), f: [slot(1), slot(0), slot(0)] })),
});

/** the whole moving scene: never re-renders during a run (all motion is native Animated values from the pool) */
const Scene = React.memo(function Scene({ pool, k, W, h, beeId, level, skin }: { pool: Pool; k: number; W: number; h: number; beeId: string; level: number; skin?: string }) {
  const kpx = (u: number) => u * k;
  const tileH = h * BG_SCALE, tileW = tileH * (16 / 9);
  return (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[StyleSheet.absoluteFill, { flexDirection: "row", transform: [{ translateX: pool.sky.v }] }]}>
      {[0, 1, 2].map((j) => <Image key={j} source={FA.sky} style={{ width: h * (16 / 9), height: h }} />)}
    </Animated.View>
    {LAYERS.map(({ name, top }, i) => (
      <Animated.View key={name} style={{ position: "absolute", left: 0, bottom: 0, height: tileH * (1 - top), flexDirection: "row", transform: [{ translateX: pool.layers[i].v }] }}>
        {[0, 1, 2].map((j) => <Image key={j} source={FA[name]} style={{ width: tileW, height: tileH * (1 - top) }} />)}
      </Animated.View>
    ))}
    {pool.stems.map((sl, i) => (
      <Animated.View key={i} style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: sl.x.v }] }}>
        <Animated.Image source={FA.stemTop} style={{ position: "absolute", width: kpx(STEM_W), height: kpx(STEM_H), transform: [{ translateY: sl.top.v }] }} />
        <Animated.Image source={FA.stemBottom} style={{ position: "absolute", width: kpx(STEM_W), height: kpx(STEM_H), transform: [{ translateY: sl.bot.v }] }} />
      </Animated.View>
    ))}
    {pool.picks.map((sl, i) => (
      <Animated.View key={i} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, overflow: "visible", transform: [{ translateX: sl.x.v }, { translateY: sl.y.v }] }}>
        {FA.picks.map((src, kd) => {
          const size = kpx(kd === 3 ? FIREFLY : CANDY);
          return <Animated.Image key={kd} source={src} style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, opacity: sl.o[kd].v }} />;
        })}
      </Animated.View>
    ))}
    {pool.bats.map((sl, i) => (
      <Animated.View key={i} style={{ position: "absolute", left: -kpx(BAT) / 2, top: -kpx(BAT) / 2, width: kpx(BAT), height: kpx(BAT), transform: [{ translateX: sl.x.v }, { translateY: sl.y.v }] }}>
        {FA.bats.map((src, j) => <Animated.Image key={j} source={src} style={[StyleSheet.absoluteFill, { width: kpx(BAT), height: kpx(BAT), opacity: sl.f[j].v }]} />)}
      </Animated.View>
    ))}
    {/* the bee with its lantern and a soft pool of light */}
    <Animated.View style={{ position: "absolute", left: kpx(W * 0.3) - kpx(BEE) / 2, top: -kpx(BEE) / 2, width: kpx(BEE), height: kpx(BEE), transform: [{ translateY: pool.beeY.v }] }}>
      <Image source={FA.glow} style={{ position: "absolute", width: kpx(GLOW), height: kpx(GLOW), left: kpx(BEE / 2 + 22 * Z - GLOW / 2), top: kpx(BEE / 2 + 30 * Z - GLOW / 2) }} />
      <Animated.View style={{ width: kpx(BEE), height: kpx(BEE), transform: [{ rotate: pool.beeRot.v.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }}>
        <BeeSprite id={beeId} size={kpx(BEE)} turn={1} level={level} skin={skin} seed={4} />
        <Image source={FA.lantern} style={{ position: "absolute", width: kpx(BEE), height: kpx(BEE) }} />
      </Animated.View>
    </Animated.View>
  </View>
  );
});

export default function FlightScreen(p: Props) {
  const insets = useInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const k = box.h / FH;
  const W = k > 0 ? box.w / k : 560;
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState({ passed: 0, candies: 0 });
  const [result, setResult] = useState<FlightReward | null>(null);
  const world = useRef<World | null>(null);
  const flap = useRef(false);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;

  // sprite pools
  const pool = useMemo(makePool, []);

  const reset = useCallback(() => {
    if (!W) return;
    world.current = newWorld(p.seed, W);
    setScore({ passed: 0, candies: 0 });
  }, [p.seed, W]);
  useEffect(() => { if (box.h) reset(); }, [box.h, reset]);

  const draw = useCallback((w: World) => {
    const tileW = FH * k * BG_SCALE * (16 / 9);
    LAYERS.forEach(({ f }, i) => pool.layers[i].set(-((w.dist * f * k) % tileW)));
    const skyW = FH * k * (16 / 9);
    pool.sky.set(-((w.dist * SKY_F * k) % skyW));
    pool.beeY.set(w.y * k);
    pool.beeRot.set(Math.max(-25, Math.min(40, (w.vy / 900) * 35)));
    const cam = w.dist;
    const stems = w.stems.filter((s) => s.x - cam > -STEM_W && s.x - cam < W + STEM_W);
    pool.stems.forEach((sl, i) => {
      const s = stems[i];
      if (!s) { sl.x.set(OFF); return; }
      sl.x.set((s.x - cam - STEM_W / 2) * k);
      sl.top.set((s.gapY - s.gap / 2 - STEM_H) * k);
      sl.bot.set((s.gapY + s.gap / 2) * k);
    });
    const picks = w.picks.filter((q) => !q.taken && q.x - cam > -100 && q.x - cam < W + 100);
    pool.picks.forEach((sl, i) => {
      const q = picks[i];
      const kind = q ? q.kind : -1;
      if (kind !== sl.kind) { // the visible kind is switched by opacity of the stacked images: no React render
        if (sl.kind >= 0) sl.o[sl.kind].set(0);
        if (kind >= 0) sl.o[kind].set(1);
        sl.kind = kind;
      }
      if (!q) return;
      sl.x.set((q.x - cam) * k);
      sl.y.set((q.y + Math.sin(w.t * 3 + q.x) * 8) * k);
    });
    const frame = Math.floor(w.t * 9) % 3;
    const bats = w.bats.filter((b) => b.x - cam > -120 && b.x - cam < W + 120);
    pool.bats.forEach((sl, i) => {
      const b = bats[i];
      if (!b) { sl.x.set(OFF); return; }
      sl.x.set((b.x - cam) * k);
      sl.y.set(batY(b, w.t) * k);
      sl.f.forEach((v, j) => v.set(j === frame ? 1 : 0));
    });
  }, [k, W, pool]);

  // game loop
  const finishRef = useRef(p.onFinish);
  finishRef.current = p.onFinish;
  useEffect(() => {
    if (!box.h) return;
    let raf = 0, last = 0, alive = true;
    const loop = (ts: number) => {
      if (!alive) return;
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      const w = world.current;
      if (w) {
        if (phaseRef.current === "run") {
          const before = w;
          const n = step(w, dt, flap.current);
          flap.current = false;
          world.current = n;
          if (n.passed !== before.passed || n.candies !== before.candies) {
            setScore({ passed: n.passed, candies: n.candies });
            if (n.candies !== before.candies) hLight();
          }
          if (n.over) {
            hError();
            phaseRef.current = "over"; // the next frames must not finish the run again before React re-renders
            setPhase("over");
            setResult(finishRef.current({ passed: n.passed, candies: n.candies }));
          }
          draw(n);
        } else if (phaseRef.current === "ready") {
          // hover before the first tap
          draw({ ...w, y: FH * 0.45 + Math.sin(ts / 260) * 14, vy: 0 });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [box.h, draw]);

  // pause when the app goes to the background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st !== "active" && phaseRef.current === "run") setPhase("paused"); });
    return () => sub.remove();
  }, []);
  // hardware / Telegram back: end the run, then leave
  const exitRef = useRef(p.onExit);
  exitRef.current = p.onExit;
  useEffect(() => {
    const sub = addBackListener(() => {
      if (phaseRef.current === "run" || phaseRef.current === "paused") { endNow(); return true; }
      exitRef.current();
      return true;
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const endNow = () => {
    const w = world.current;
    if (!w || phaseRef.current === "over") return;
    world.current = { ...w, over: true };
    phaseRef.current = "over";
    setPhase("over");
    setResult(finishRef.current({ passed: w.passed, candies: w.candies }));
  };
  const tap = () => {
    if (phaseRef.current === "over") return;
    if (phaseRef.current !== "run") setPhase("run");
    flap.current = true;
  };

  return (
    <View style={styles.root} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onStartShouldSetResponder={() => true} onResponderGrant={tap}>
      {k > 0 ? (
        <Scene pool={pool} k={k} W={W} h={box.h} beeId={p.beeId} level={p.level} skin={p.skin} />
      ) : null}

      {/* HUD */}
      <View pointerEvents="box-none" style={[styles.hud, { top: insets.top + 8 }]}>
        <Press onPress={() => (phase === "over" ? p.onExit() : endNow())} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t("game.exit")}>
          <Image source={ART.close} style={{ width: 18, height: 18, tintColor: C.brown }} />
        </Press>
        <View style={{ flex: 1, alignItems: "center" }} pointerEvents="none">
          <Text style={[F.black, styles.score]}>{score.passed}</Text>
        </View>
        <View style={styles.candy} pointerEvents="none" accessibilityLabel={t("fl.candies", { n: score.candies })}>
          <Image source={FA.picks[0]} style={{ width: 26, height: 26 }} />
          <Text style={[F.black, { color: "#fff", fontSize: 18 }]}>{score.candies}</Text>
        </View>
      </View>
      {phase === "ready" || phase === "paused" ? (
        <View pointerEvents="none" style={styles.center}>
          <Txt v="h1" color="#fff" center>{t(phase === "ready" ? "fl.title" : "fl.paused")}</Txt>
          <Txt v="body" color={K.fg("#FFC56B")} center style={{ marginTop: 6 }}>{t("fl.tap")}</Txt>
          {phase === "ready" ? (
            <Txt v="small" color={K.fg("#BFF5E6")} center style={{ marginTop: 10 }}>
              {p.paidLeft > 0 ? t("fl.paidLeft", { n: p.paidLeft }) : t("fl.forFun")}{p.event ? ` · ${t("fl.eventHint")}` : ""}
            </Txt>
          ) : null}
        </View>
      ) : null}

      <Overlay visible={phase === "over" && !!result} dismissable={false}>
        {result ? (
          <View accessibilityLabel={t("game.results")}>
            {/* a little night scene: the bee with its lantern over the meadow */}
            <View style={styles.resHead}>
              <Image source={FA.sky} resizeMode="cover" style={StyleSheet.absoluteFill} />
              <Image source={FA.near} resizeMode="cover" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, width: "100%" }} />
              <Image source={FA.glow} style={{ position: "absolute", width: 170, height: 170, left: "50%", marginLeft: -78, top: -10 }} />
              <View style={{ width: 110, height: 110 }}>
                <BeeSprite id={p.beeId} size={110} turn={1} level={p.level} skin={p.skin} seed={4} flap={false} />
                <Image source={FA.lantern} style={{ position: "absolute", width: 110, height: 110 }} />
              </View>
              {result.record ? <View style={styles.ribbon}><Txt v="tiny" color="#fff" style={F.black}>{t("fl.record").toUpperCase()}</Txt></View> : null}
            </View>
            <Txt v="h1" center style={{ marginTop: 10 }}>{result.record ? t("fl.record") : t("fl.over")}</Txt>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <CountUp value={score.passed} duration={700} style={[F.black, { fontSize: 34, lineHeight: 40, color: C.text }]} />
                <Txt v="tiny" color={C.dim} center>{t("fl.stemsShort")}</Txt>
              </View>
              <View style={[styles.stat, styles.statMid]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Image source={FA.picks[0]} style={{ width: 26, height: 26 }} />
                  <Text style={[F.black, { fontSize: 26, lineHeight: 40, color: C.honeyDark }]}>{score.candies}</Text>
                </View>
                <Txt v="tiny" color={C.dim} center>{t("fl.candiesShort")}</Txt>
              </View>
              <View style={styles.stat}>
                <Text style={[F.black, { fontSize: 26, lineHeight: 40, color: result.record ? "#C25E00" : C.text }]}>{Math.max(p.best, score.passed)}</Text>
                <Txt v="tiny" color={C.dim} center>{t("fl.bestShort")}</Txt>
              </View>
            </View>
            {result.nectar > 0 || result.points > 0 ? (
              <View style={styles.rewardRow}>
                {result.nectar > 0 ? <View style={styles.rewardItem}><Image source={ART.nectar} style={{ width: 30, height: 30 }} /><Text style={[F.black, styles.rw]}>+{result.nectar}</Text></View> : null}
                {result.points > 0 ? <View style={styles.rewardItem}><Image source={ART.point} style={{ width: 30, height: 30 }} /><Text style={[F.black, styles.rw, { color: K.fg("#C25E00") }]}>+{result.points}</Text></View> : null}
              </View>
            ) : null}
            <Txt v="small" color={C.dim} center style={{ marginTop: 10 }}>{result.paidLeft > 0 ? t("fl.paidLeft", { n: result.paidLeft }) : t("fl.forFun")}</Txt>
            <View style={{ alignSelf: "stretch", marginTop: 14, gap: 10 }}>
              <GameButton title={t("game.again")} color="green" onPress={() => { hSuccess(); p.onReplay(); }} />
              <GameButton title={t("game.menu")} color="white" onPress={p.onExit} />
            </View>
          </View>
        ) : null}
      </Overlay>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: K.bg("#2B1B3D"), overflow: "hidden" },
  hud: { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: K.bg("#fff"), alignItems: "center", justifyContent: "center", ...shadow, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  score: { fontSize: 44, lineHeight: 50, color: "#fff", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  candy: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: K.bg("rgba(58,47,91,0.85)"), borderRadius: 18, paddingHorizontal: 10, height: 40 },
  center: { position: "absolute", left: 24, right: 24, top: "22%", alignItems: "center" },
  resHead: { height: 132, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#2B1B3D") },
  ribbon: { position: "absolute", top: 10, right: 10, backgroundColor: K.bg("#F08A24"), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statRow: { flexDirection: "row", marginTop: 10, backgroundColor: K.bg("#FFF8EA"), borderRadius: 18, borderWidth: 1.5, borderColor: C.line, paddingVertical: 8 },
  stat: { flex: 1, alignItems: "center" },
  statMid: { borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: C.line },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 14 },
  rewardItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: K.bg("#FFF"), borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, ...shadow, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  rw: { fontSize: 20, color: C.honeyDark },
}));
