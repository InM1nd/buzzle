/**
 * v1.6 Meadow mini-game «Ночной полёт». The world lives in a ref and is advanced by requestAnimationFrame;
 * sprites are fixed pools moved with Animated.Value.setValue (no React render per frame, which matters in the
 * Telegram webview). React state only changes for the score, the pickup kinds and the phase.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Image, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { batY, FH, newWorld, step, STEM_W, World } from "../logic/nightFlight";
import { FlightReward } from "../logic/game";
import { addBackListener } from "../platform/back";
import { useInsets } from "../platform/insets";
import { ART } from "../ui/art";
import { BeeSprite } from "../ui/BeeSprite";
import { CountUp, GameButton, Overlay, Press, Txt } from "../ui/components";
import { hError, hLight, hSuccess } from "../ui/haptics";
import { C, F, shadow } from "../ui/theme";

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
};
const STEMS = 5, PICKS = 8, BATS = 3, BEE = 150, BAT = 150, CANDY = 92, FIREFLY = 64;
const LAYERS: [keyof typeof FA, number][] = [["sky", 0.04], ["far", 0.25], ["near", 1]];
const OFF = -99999;
/** lantern light: stacked faint discs read as a soft radial glow (no gradients in RN) */
const GLOW = [270, 240, 210, 182, 156, 132, 110, 90, 72, 56];

interface Props {
  beeId: string; skin?: string; level: number; best: number; paidLeft: number; event: boolean; seed: number;
  onFinish: (r: { passed: number; candies: number }) => FlightReward;
  onExit: () => void; onReplay: () => void;
}
type Phase = "ready" | "run" | "paused" | "over";

const av = () => new Animated.Value(OFF);

export default function FlightScreen(p: Props) {
  const insets = useInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const k = box.h / FH;
  const W = k > 0 ? box.w / k : 560;
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState({ passed: 0, candies: 0 });
  const [kinds, setKinds] = useState<number[]>(() => Array(PICKS).fill(0));
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;
  const [result, setResult] = useState<FlightReward | null>(null);
  const world = useRef<World | null>(null);
  const flap = useRef(false);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;

  // sprite pools
  const pool = useMemo(() => ({
    layers: LAYERS.map(() => new Animated.Value(0)),
    beeY: new Animated.Value(0), beeRot: new Animated.Value(0),
    stems: Array.from({ length: STEMS }, () => ({ x: av(), top: av(), bot: av() })),
    picks: Array.from({ length: PICKS }, () => ({ x: av(), y: av(), o: new Animated.Value(0) })),
    bats: Array.from({ length: BATS }, () => ({ x: av(), y: av(), f: [new Animated.Value(1), new Animated.Value(0), new Animated.Value(0)] })),
  }), []);

  const reset = useCallback(() => {
    if (!W) return;
    world.current = newWorld(p.seed, W);
    setScore({ passed: 0, candies: 0 });
  }, [p.seed, W]);
  useEffect(() => { if (box.h) reset(); }, [box.h, reset]);

  const draw = useCallback((w: World) => {
    const tileW = FH * k * (16 / 9);
    LAYERS.forEach(([, f], i) => pool.layers[i].setValue(-((w.dist * f * k) % tileW)));
    pool.beeY.setValue(w.y * k);
    pool.beeRot.setValue(Math.max(-25, Math.min(40, (w.vy / 900) * 35)));
    const cam = w.dist;
    const stems = w.stems.filter((s) => s.x - cam > -STEM_W && s.x - cam < W + STEM_W);
    pool.stems.forEach((sl, i) => {
      const s = stems[i];
      if (!s) { sl.x.setValue(OFF); return; }
      sl.x.setValue((s.x - cam - STEM_W / 2) * k);
      sl.top.setValue((s.gapY - s.gap / 2 - FH) * k);
      sl.bot.setValue((s.gapY + s.gap / 2) * k);
    });
    const picks = w.picks.filter((q) => !q.taken && q.x - cam > -100 && q.x - cam < W + 100);
    let changed = false;
    const nk = kindsRef.current.slice();
    pool.picks.forEach((sl, i) => {
      const q = picks[i];
      if (!q) { sl.o.setValue(0); return; }
      if (nk[i] !== q.kind) { nk[i] = q.kind; changed = true; }
      sl.o.setValue(1);
      sl.x.setValue((q.x - cam) * k);
      sl.y.setValue((q.y + Math.sin(w.t * 3 + q.x) * 8) * k);
    });
    if (changed) { kindsRef.current = nk; setKinds(nk); }
    const frame = Math.floor(w.t * 9) % 3;
    const bats = w.bats.filter((b) => b.x - cam > -120 && b.x - cam < W + 120);
    pool.bats.forEach((sl, i) => {
      const b = bats[i];
      if (!b) { sl.x.setValue(OFF); return; }
      sl.x.setValue((b.x - cam) * k);
      sl.y.setValue(batY(b, w.t) * k);
      sl.f.forEach((v, j) => v.setValue(j === frame ? 1 : 0));
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

  const kpx = (u: number) => u * k;
  const tileW = FH * k * (16 / 9);
  return (
    <View style={styles.root} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onStartShouldSetResponder={() => true} onResponderGrant={tap}>
      {k > 0 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {LAYERS.map(([name], i) => (
            <Animated.View key={name} style={[StyleSheet.absoluteFill, { flexDirection: "row", transform: [{ translateX: pool.layers[i] }] }]}>
              {[0, 1, 2].map((j) => <Image key={j} source={FA[name]} style={{ width: tileW, height: box.h }} />)}
            </Animated.View>
          ))}
          {pool.stems.map((sl, i) => (
            <Animated.View key={i} style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: sl.x }] }}>
              <Animated.Image source={FA.stemTop} style={{ position: "absolute", width: kpx(STEM_W), height: kpx(FH), transform: [{ translateY: sl.top }] }} />
              <Animated.Image source={FA.stemBottom} style={{ position: "absolute", width: kpx(STEM_W), height: kpx(FH), transform: [{ translateY: sl.bot }] }} />
            </Animated.View>
          ))}
          {pool.picks.map((sl, i) => {
            const size = kpx(kinds[i] === 3 ? FIREFLY : CANDY);
            return <Animated.Image key={i} source={FA.picks[kinds[i]]} style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, opacity: sl.o, transform: [{ translateX: sl.x }, { translateY: sl.y }] }} />;
          })}
          {pool.bats.map((sl, i) => (
            <Animated.View key={i} style={{ position: "absolute", left: -kpx(BAT) / 2, top: -kpx(BAT) / 2, width: kpx(BAT), height: kpx(BAT), transform: [{ translateX: sl.x }, { translateY: sl.y }] }}>
              {FA.bats.map((src, j) => <Animated.Image key={j} source={src} style={[StyleSheet.absoluteFill, { width: kpx(BAT), height: kpx(BAT), opacity: sl.f[j] }]} />)}
            </Animated.View>
          ))}
          {/* the bee with its lantern and a soft pool of light */}
          <Animated.View style={{ position: "absolute", left: kpx(W * 0.3) - kpx(BEE) / 2, top: -kpx(BEE) / 2, width: kpx(BEE), height: kpx(BEE), transform: [{ translateY: pool.beeY }] }}>
            {GLOW.map((r) => (
              <View key={r} style={[styles.glow, { width: kpx(2 * r), height: kpx(2 * r), borderRadius: kpx(r), left: kpx(BEE / 2 + 22 - r), top: kpx(BEE / 2 + 30 - r) }]} />
            ))}
            <Animated.View style={{ width: kpx(BEE), height: kpx(BEE), transform: [{ rotate: pool.beeRot.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }}>
              <BeeSprite id={p.beeId} size={kpx(BEE)} turn={1} level={p.level} skin={p.skin} seed={4} />
              <Image source={FA.lantern} style={{ position: "absolute", width: kpx(BEE), height: kpx(BEE) }} />
            </Animated.View>
          </Animated.View>
        </View>
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
          <Txt v="body" color="#FFC56B" center style={{ marginTop: 6 }}>{t("fl.tap")}</Txt>
          {phase === "ready" ? (
            <Txt v="small" color="#BFF5E6" center style={{ marginTop: 10 }}>
              {p.paidLeft > 0 ? t("fl.paidLeft", { n: p.paidLeft }) : t("fl.forFun")}{p.event ? ` · ${t("fl.eventHint")}` : ""}
            </Txt>
          ) : null}
        </View>
      ) : null}

      <Overlay visible={phase === "over" && !!result} dismissable={false}>
        {result ? (
          <View style={{ alignItems: "center" }} accessibilityLabel={t("game.results")}>
            <Image source={FA.lantern} style={{ width: 84, height: 84 }} />
            <Txt v="h1" center>{result.record ? t("fl.record") : t("fl.over")}</Txt>
            <Txt v="tiny" color={C.dim} style={{ marginTop: 10 }}>{t("fl.stems")}</Txt>
            <CountUp value={score.passed} duration={700} style={[F.black, { fontSize: 40, lineHeight: 46, color: C.text }]} />
            {p.best > 0 && !result.record ? <Txt v="small" color={C.dim}>{t("game.best", { n: String(p.best) })}</Txt> : null}
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}><Image source={FA.picks[0]} style={{ width: 30, height: 30 }} /><Text style={[F.black, styles.rw]}>{score.candies}</Text></View>
              {result.nectar > 0 ? <View style={styles.rewardItem}><Image source={ART.nectar} style={{ width: 30, height: 30 }} /><Text style={[F.black, styles.rw]}>+{result.nectar}</Text></View> : null}
              {result.points > 0 ? <View style={styles.rewardItem}><Image source={ART.point} style={{ width: 30, height: 30 }} /><Text style={[F.black, styles.rw, { color: "#C25E00" }]}>+{result.points}</Text></View> : null}
            </View>
            <Txt v="small" color={C.dim} center style={{ marginTop: 10 }}>{result.paidLeft > 0 ? t("fl.paidLeft", { n: result.paidLeft }) : t("fl.forFun")}</Txt>
            <View style={{ alignSelf: "stretch", marginTop: 16, gap: 10 }}>
              <GameButton title={t("game.again")} color="green" onPress={() => { hSuccess(); p.onReplay(); }} />
              <GameButton title={t("game.menu")} color="white" onPress={p.onExit} />
            </View>
          </View>
        ) : null}
      </Overlay>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2B1B3D", overflow: "hidden" },
  glow: { position: "absolute", backgroundColor: "#FFC56B", opacity: 0.03 },
  hud: { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  score: { fontSize: 44, lineHeight: 50, color: "#fff", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  candy: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(58,47,91,0.85)", borderRadius: 18, paddingHorizontal: 10, height: 40 },
  center: { position: "absolute", left: 24, right: 24, top: "22%", alignItems: "center" },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 14 },
  rewardItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, ...shadow },
  rw: { fontSize: 20, color: C.honeyDark },
});
