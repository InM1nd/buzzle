/**
 * v1.7 winter mini-game «Какао-сорт» (Water Sort with drinks), look C «Лавка Жужи» from
 * design/concepts/minigames/cocoa-sort/ui-options-v3. Rules and levels live in src/logic/cocoaSort.ts.
 * Mugs and drinks are plain Views (no canvas / Skia): layers are stacked boxes clipped by the glass. A pour lifts a copy of
 * the mug over the target, tilts it, drains the top block while the target fills, then puts it back; the liquid inside the
 * tilted mug is counter-rotated so its surface stays level. Progress (the current level) lives in the game save (GameState.cocoa).
 * Art: assets/art/cocoa (interface C): the glass is an image drawn over the liquid, the liquid box comes from vessel_layout.json.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { t, tx } from "../i18n";
import { Board, CAP, Cup, complete, isWon, levelAt, pour, shape, stars } from "../logic/cocoaSort";
import { addBackListener } from "../platform/back";
import { useInsets } from "../platform/insets";
import { ART } from "../ui/art";
import { Mascot } from "../ui/BeeSprite";
import { GameButton, Overlay, Press, Stars, Txt } from "../ui/components";
import { useReduceMotion } from "../ui/EventCine";
import { hError, hLight, hSuccess } from "../ui/haptics";
import { F, shadow } from "../ui/theme";

/* eslint-disable @typescript-eslint/no-require-imports */
const BG = require("../../assets/art/cocoa/background_cafe_winter.webp");
const MUG = require("../../assets/art/cocoa/mug_glass.webp");
const SHELF = require("../../assets/art/cocoa/shelf_wood.webp");
const PLAQUE = require("../../assets/art/cocoa/title_plaque.webp");
/** a finished drink gets its topping (cocoa, sbiten, mint tea, berry morse, honey milk; the two extra drinks have none) */
const TOPPER = [
  require("../../assets/art/cocoa/topper_marshmallow.webp"), require("../../assets/art/cocoa/topper_cinnamon.webp"),
  require("../../assets/art/cocoa/topper_mint.webp"), require("../../assets/art/cocoa/topper_berries.webp"), require("../../assets/art/cocoa/topper_honeycomb.webp"),
];
/** drink colours (the first five from vessel_layout.json) + a glyph per drink, so the layers read without colour too */
const DRINK = ["#824529", "#F3AA24", "#659E57", "#B94769", "#F4DCA7", "#9C2F3C", "#5B5BB0"];
const GLYPH = ["●", "◆", "♣", "♥", "✿", "▲", "★"];
const GLYPH_ON = ["#FFE9D2", "#5A3200", "#E6FFE9", "#FFE3EC", "#8A5A2B", "#FFE0E0", "#E6E6FF"];
const FOAM = "#FFFFFF"; // whipped cream: whiter than honey milk, with a grey "?"
const UNDOS = 3;
const TILT = 1.05; // rad, about 60°

interface Play { board: Board; par: number; moves: number; undos: number; added: boolean; history: { board: Board; moves: number }[] }
const fresh = (n: number): Play => { const { n: _n, par, colors: _c, ...board } = levelAt(n); return { board, par, moves: 0, undos: UNDOS, added: false, history: [] }; };
/** the first level of each twist explains it once */
const INTRO: Record<number, "cs.newOrders" | "cs.newFoam" | "cs.newIce"> = { 2: "cs.newOrders", 4: "cs.newFoam", 8: "cs.newIce" };

/** no legal pour at all (ice may still melt only by pouring, so a frozen board with no pours is stuck too) */
const stuck = (b: Board) => !b.cups.some((_, f) => b.cups.some((__, to) => pour(b, f, to)));

interface Geo { cw: number; ch: number; pos: { x: number; y: number }[]; shelves: { y: number; x: number; w: number }[]; h: number }
/** vessel_layout.json (1024 space): liquid box x 234–716, fill 165–898, the mug stands on y 969, topping anchor (473, 142) */
const V = { x0: 234 / 1024, x1: 716 / 1024, top: 165 / 1024, bottom: 898 / 1024, foot: 969 / 1024, topX: 473 / 1024, topY: 142 / 1024 };
/** mugs in rows of 3 or 4 on shelves, centred; a mug cell is square (the image has transparent margins) */
function layout(n: number, W: number, maxH: number): Geo {
  const cols = n <= 3 ? n : n <= 6 ? 3 : n === 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const gap = 2;
  let cw = Math.min(124, (W - gap * (cols + 1)) / cols);
  cw = Math.min(cw, maxH / rows - 10);
  const ch = cw, rowH = ch + 10;
  const shelfH = Math.min((W - 16) / 4, ch * 0.42);
  const pos: Geo["pos"] = [], shelves: Geo["shelves"] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const rowW = inRow * cw + (inRow - 1) * gap;
    const x0 = (W - rowW) / 2;
    for (let c = 0; c < inRow; c++) pos.push({ x: x0 + c * (cw + gap), y: r * rowH + 14 });
    // the plank top (35% of the shelf picture, ui_layout cupBaselineY) under the mugs' foot
    shelves.push({ y: r * rowH + 14 + ch * V.foot - shelfH * 0.35, x: 8, w: W - 16 });
  }
  return { cw, ch, pos, shelves, h: rows * rowH + 14 };
}

/** liquid box inside a mug cell of size w × h (square) */
const inner = (w: number, h: number) => ({ left: w * V.x0, right: w * (1 - V.x1), top: h * V.top, bottom: h * (1 - V.bottom), u: (h * (V.bottom - V.top)) / CAP });

function Layer({ color, hidden, h }: { color: number; hidden: boolean; h: number | Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View style={{ height: h, backgroundColor: hidden ? FOAM : DRINK[color], borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Text style={[F.black, { fontSize: 13, color: hidden ? "#9A8F86" : GLYPH_ON[color], opacity: 0.85 }]}>{hidden ? "?" : GLYPH[color]}</Text>
    </Animated.View>
  );
}

/** the glass picture over the liquid; liquid is passed as children, clipped to the liquid box */
function Glass({ w, h, children, glow }: { w: number; h: number; children?: React.ReactNode; glow?: boolean }) {
  const i = inner(w, h);
  return (
    <View style={{ width: w, height: h }}>
      {glow ? <View pointerEvents="none" style={{ position: "absolute", left: i.left - w * 0.08, right: i.right - w * 0.08, top: i.top - h * 0.08, bottom: i.bottom - h * 0.02, borderRadius: w * 0.12, backgroundColor: "rgba(255,210,122,0.45)" }} /> : null}
      <View style={{ position: "absolute", left: i.left, right: i.right, top: i.top, bottom: i.bottom, overflow: "hidden", borderBottomLeftRadius: w * 0.07, borderBottomRightRadius: w * 0.07 }}>
        {children}
      </View>
      <Image source={MUG} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} />
    </View>
  );
}

/** a mug on the shelf. `extra` is a block of drink being poured in (animated height). */
function Mug({ cup, hidden, ice, w, h, selected, extra, onPress, index }: {
  cup: Cup; hidden: number; ice: number; w: number; h: number; selected: boolean; index: number;
  extra?: { color: number; h: Animated.AnimatedInterpolation<number> | Animated.Value }; onPress: () => void;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(lift, { toValue: selected ? -14 : 0, useNativeDriver: false, speed: 30, bounciness: 8 }).start(); }, [selected, lift]);
  const i = inner(w, h);
  const done = complete(cup);
  const a11y = cup.length ? cup.map((c, k) => (k < hidden ? t("cs.hidden") : tx(`cs.d${c}`))).join(", ") : t("cs.empty");
  return (
    <Press onPress={onPress} scaleTo={0.97} haptic={false} accessibilityRole="button" accessibilityLabel={t("cs.mugA11y", { i: index + 1, layers: a11y })} accessibilityState={{ selected }}>
      <Animated.View style={{ transform: [{ translateY: lift }] }}>
        <Glass w={w} h={h} glow={selected}>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "column-reverse" }}>
            {cup.map((c, k) => <Layer key={k} color={c} hidden={k < hidden} h={i.u} />)}
            {extra ? <Layer color={extra.color} hidden={false} h={extra.h} /> : null}
          </View>
          {ice > 0 ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(200,232,255,0.62)", alignItems: "center", justifyContent: "center" }]}>
              <Text style={[F.black, { fontSize: w * 0.26, color: "#2E6E9E" }]}>❄</Text>
              <Text style={[F.black, { fontSize: 15, color: "#2E6E9E" }]}>{ice}</Text>
            </View>
          ) : null}
        </Glass>
        {done ? (TOPPER[cup[0]]
          ? <Image source={TOPPER[cup[0]]} style={{ position: "absolute", left: w * V.topX - w * 0.2, top: h * V.topY - w * 0.3, width: w * 0.4, height: w * 0.4 }} />
          : <Image source={ART.check} style={{ position: "absolute", top: 0, left: w / 2 - 12, width: 24, height: 24 }} />) : null}
      </Animated.View>
    </Press>
  );
}

interface Pouring { from: number; to: number; count: number; color: number; before: Board; after: Board }

/** level: the saved current level; onWin: the level was solved with these stars (App credits it and moves the save on);
 *  flakes: snowflakes a solved level pays (shown on the win card) */
export default function CocoaSortScreen({ level, onWin, onExit, flakes }: { level: number; onWin: (level: number, stars: number) => void; onExit: () => void; flakes: (stars: number) => number }) {
  const insets = useInsets();
  const reduce = useReduceMotion();
  const [n, setN] = useState<number | null>(level);
  const [play, setPlay] = useState<Play | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState(t("cs.hintPick"));
  const [pouring, setPouring] = useState<Pouring | null>(null);
  const [intro, setIntro] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const p = useRef(new Animated.Value(0)).current;
  const levelRef = useRef(0);
  levelRef.current = n ?? 0;
  const playRef = useRef<Play | null>(null);
  playRef.current = play;

  useEffect(() => {
    if (n === null) return;
    setPlay(fresh(n)); setSel(null); setMsg(t("cs.hintPick"));
    setIntro(INTRO[n] ?? null);
  }, [n]);

  const leave = useCallback(() => { if (!pouring) onExit(); }, [onExit, pouring]);
  useEffect(() => { const sub = addBackListener(() => { leave(); return true; }); return () => sub.remove(); }, [leave]);

  const board = play?.board;
  const geo = useMemo(() => (board && size.w ? layout(board.cups.length, size.w, size.h) : null), [board, size]);

  const finishPour = useCallback((pr: Pouring) => {
    setPlay((pl) => pl && { ...pl, board: pr.after, moves: pl.moves + 1, history: [...pl.history, { board: pr.before, moves: pl.moves }] });
    setPouring(null);
    if (isWon(pr.after)) {
      hSuccess(); setMsg(t("cs.win"));
      const pl = playRef.current;
      if (pl) onWin(levelRef.current, stars(pl.moves + 1, pl.par));
      return;
    }
    if (stuck(pr.after)) { setMsg(t("cs.stuck")); return; }
    const served = pr.after.orders.length < pr.before.orders.length;
    if (served) hSuccess();
    setMsg(served ? t("cs.served") : t("cs.hintPick"));
  }, [onWin]);

  const choose = (i: number) => {
    if (!play || pouring || isWon(play.board)) return;
    const b = play.board;
    if (b.ice[i] > 0) { hError(); setMsg(t("cs.hintIce", { n: b.ice[i] })); return; }
    if (sel === null) {
      if (!b.cups[i].length) { setMsg(t("cs.hintPick")); return; }
      if (complete(b.cups[i])) { setMsg(t("cs.hintDone")); return; }
      hLight(); setSel(i); setMsg(t("cs.hintTarget")); return;
    }
    if (sel === i) { setSel(null); setMsg(t("cs.hintPick")); return; }
    const m = pour(b, sel, i);
    if (!m) {
      // tapping another pourable mug switches the selection
      if (b.cups[i].length && !complete(b.cups[i])) { hLight(); setSel(i); setMsg(t("cs.hintTarget")); return; }
      hError(); setMsg(t("cs.hintNo")); return;
    }
    setSel(null); setMsg(t("cs.hintPick"));
    // the board shows the cups as they were while the copy pours; the target's top shows the source's colour block growing
    const pr: Pouring = { from: sel, to: i, count: m.count, color: m.color, before: b, after: m.board };
    if (reduce) { finishPour(pr); return; }
    setPouring(pr);
    p.setValue(0);
    Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(p, { toValue: 2, duration: 520 + 140 * m.count, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(p, { toValue: 3, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start(() => finishPour(pr));
  };

  const undo = () => {
    if (!play || pouring || !play.undos || !play.history.length) return;
    const last = play.history[play.history.length - 1];
    setPlay({ ...play, board: last.board, moves: last.moves, undos: play.undos - 1, history: play.history.slice(0, -1) });
    setSel(null);
  };
  const addMug = () => {
    if (!play || pouring || play.added || isWon(play.board)) return;
    const b = play.board;
    setPlay({ ...play, added: true, history: [], board: { ...b, cups: [...b.cups, []], hidden: [...b.hidden, 0], ice: [...b.ice, 0] } });
    setSel(null);
  };
  const next = () => { if (n !== null) setN(n + 1); };
  const restart = () => { if (n !== null && !pouring) { setPlay(fresh(n)); setSel(null); setMsg(t("cs.hintPick")); } };

  if (n === null || !play || !board) return <View style={{ flex: 1, backgroundColor: "#3B2418" }} />;
  const won = isWon(board);
  const st = stars(play.moves, play.par);

  return (
    <View style={{ flex: 1 }}>
      <Image source={BG} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(40,22,14,0.12)" }]} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingHorizontal: 12 }}>
        {/* top bar: close · title plaque · moves */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Press onPress={leave} style={styles.close} accessibilityRole="button" accessibilityLabel={t("game.exit")}>
            <Image source={ART.close} style={{ width: 22, height: 22, tintColor: "#4A2C12" }} />
          </Press>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={styles.plaque}>
              <Image source={PLAQUE} style={{ position: "absolute", left: 0, top: 0, width: 240, height: 80 }} resizeMode="stretch" />
              <Text style={[F.black, { fontSize: 20, color: "#4A2C12" }]} numberOfLines={1}>{t("cs.title")}</Text>
            </View>
            <View style={styles.levelPill}><Text style={[F.xbold, { fontSize: 13, color: "#4A2C12" }]}>{t("cs.level", { n: n + 1 })}</Text></View>
          </View>
          <View style={styles.moves}><Text style={[F.black, { fontSize: 14, color: "#FFF1DA" }]}>{t("cs.moves", { n: play.moves })}</Text></View>
        </View>
        <View style={{ alignItems: "center", marginTop: 6 }}><Stars n={st} size={24} /></View>

        {/* Zhuzha's order ticket */}
        {shape(n).orders ? (
          <View style={styles.order}>
            <Mascot size={40} />
            <View style={{ flex: 1 }}>
              <Txt v="tiny" color="#8A5A2B">{t("cs.order")}</Txt>
              {board.orders.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: DRINK[board.orders[0]] }]}><Text style={[F.black, { fontSize: 11, color: GLYPH_ON[board.orders[0]] }]}>{GLYPH[board.orders[0]]}</Text></View>
                  <Txt v="small" color="#4A2C12">{tx(`cs.d${board.orders[0]}`)}</Txt>
                  {board.orders.length > 1 ? <Txt v="tiny" color="#8A5A2B">{` +${board.orders.length - 1}`}</Txt> : null}
                </View>
              ) : <Txt v="small" color="#4E7A2A">{t("cs.ordersDone")}</Txt>}
            </View>
          </View>
        ) : null}

        {/* shelves with mugs */}
        <View style={{ flex: 1, justifyContent: "center" }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {geo ? (
            <View style={{ height: geo.h }}>
              {geo.shelves.map((s, k) => (
                <Image key={k} source={SHELF} resizeMode="stretch" style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: Math.min(s.w / 4, geo.ch * 0.42) }} />
              ))}
              {board.cups.map((cup, i) => {
                const pr = pouring;
                const shown = pr ? pr.before : board;
                const extra = pr && pr.to === i ? { color: pr.color, h: p.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 0, pr.count * inner(geo.cw, geo.ch).u, pr.count * inner(geo.cw, geo.ch).u] }) } : undefined;
                return (
                  <View key={i} style={{ position: "absolute", left: geo.pos[i].x, top: geo.pos[i].y, opacity: pr && pr.from === i ? 0 : 1 }}>
                    <Mug cup={shown.cups[i]} hidden={shown.hidden[i]} ice={shown.ice[i]} w={geo.cw} h={geo.ch} index={i}
                      selected={sel === i} extra={extra} onPress={() => choose(i)} />
                  </View>
                );
              })}
              {pouring ? <Flying pr={pouring} geo={geo} p={p} /> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.status}><Txt v="small" color="#FFF1DA" center>{msg}</Txt></View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <GameButton style={{ flex: 1 }} color="purple" title={t("cs.undo", { n: play.undos })} disabled={!play.undos || !play.history.length || !!pouring} onPress={undo} />
          <GameButton style={{ flex: 1 }} color="purple" title={t("cs.addMug", { n: play.added ? 0 : 1 })} disabled={play.added || won || !!pouring} onPress={addMug} />
        </View>
        <Press onPress={restart} style={{ alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16 }} accessibilityRole="button">
          <Txt v="small" color="#FFF1DA">↻ {t("cs.restart")}</Txt>
        </Press>
      </View>

      <Overlay visible={won && !pouring} dismissable={false} glow>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Mascot size={88} />
          <Txt v="h2" center>{t("cs.win")}</Txt>
          <Stars n={st} size={36} animate />
          <Txt v="small" center>{t("cs.winSub", { n: play.moves })}</Txt>
          {flakes(st) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Image source={ART.flake} style={{ width: 28, height: 24 }} resizeMode="contain" />
              <Txt v="h2" color="#2E6FA8">+{flakes(st)}</Txt>
            </View>
          ) : null}
          <GameButton title={t("cs.next")} color="green" onPress={next} style={{ alignSelf: "stretch", marginTop: 6 }} />
          <GameButton title={t("cs.restart")} color="white" small onPress={restart} style={{ alignSelf: "stretch" }} />
        </View>
      </Overlay>
      <Overlay visible={!!intro && !won} onClose={() => setIntro(null)}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Mascot size={72} />
          <Txt v="body" center>{intro ? tx(intro) : ""}</Txt>
          <GameButton title={t("cs.ok")} onPress={() => setIntro(null)} style={{ alignSelf: "stretch" }} />
        </View>
      </Overlay>
    </View>
  );
}

/** the lifted copy of the source mug: moves over the target, tilts, drains its top block, and comes back */
function Flying({ pr, geo, p }: { pr: Pouring; geo: Geo; p: Animated.Value }) {
  const { cw: w, ch: h } = geo;
  const src = geo.pos[pr.from], dst = geo.pos[pr.to];
  const i = inner(w, h);
  const tx = dst.x + w / 2, ty = dst.y + h * 0.05;
  // the lip corner (top, on the pouring side) relative to the mug centre after rotation; the mug hangs left of the target
  // and tips clockwise, unless there's no room on the left
  const lip = (dir: number) => {
    const a = dir * TILT, cx = dir * w / 2, cy = -h / 2;
    return { a, x: cx * Math.cos(a) - cy * Math.sin(a), y: cx * Math.sin(a) + cy * Math.cos(a) };
  };
  const right = lip(1);
  const { a, x: lipX, y: lipY } = tx - right.x - w / 2 < 0 ? lip(-1) : right;
  const endCx = tx - lipX, endCy = ty - h * 0.4 - lipY;
  const dx = endCx - (src.x + w / 2), dy = endCy - (src.y + h / 2);
  const along = { inputRange: [0, 1, 2, 3], extrapolate: "clamp" as const };
  const X = p.interpolate({ ...along, outputRange: [0, dx, dx, 0] });
  const Y = p.interpolate({ ...along, outputRange: [0, dy, dy, 0] });
  const R = p.interpolate({ ...along, outputRange: [0, a, a, 0] });
  const rot = R.interpolate({ inputRange: [-Math.PI, Math.PI], outputRange: ["-180deg", "180deg"] });
  const counter = R.interpolate({ inputRange: [-Math.PI, Math.PI], outputRange: ["180deg", "-180deg"] });
  const cup = pr.before.cups[pr.from];
  const keep = cup.slice(0, cup.length - pr.count);
  const drain = p.interpolate({ ...along, outputRange: [pr.count * i.u, pr.count * i.u, 0, 0] });
  const streamO = p.interpolate({ inputRange: [0, 1, 1.08, 1.9, 2, 3], outputRange: [0, 0, 1, 1, 0, 0] });
  // target surface after the pour, for the stream's length
  const surf = dst.y + h - i.bottom - (pr.before.cups[pr.to].length + pr.count) * i.u;
  const lipAbsY = endCy + lipY;
  return (
    <>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: tx - 3, top: lipAbsY, width: 6, height: Math.max(8, surf - lipAbsY), borderRadius: 3, backgroundColor: DRINK[pr.color], opacity: streamO }} />
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: src.x, top: src.y, transform: [{ translateX: X }, { translateY: Y }, { rotate: rot }], ...shadow }}>
        <Glass w={w} h={h}>
          {/* liquid counter-rotated about the glass centre so its surface stays level; oversized so the tilted glass stays filled */}
          <Animated.View style={{ position: "absolute", left: -w, right: -w, top: -h, bottom: -h, transform: [{ rotate: counter }] }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: h, flexDirection: "column-reverse", paddingHorizontal: w * 0.6 }}>
              {keep.map((c, k) => <Layer key={k} color={c} hidden={k < pr.before.hidden[pr.from]} h={i.u} />)}
              <Layer color={pr.color} hidden={false} h={drain} />
            </View>
          </Animated.View>
        </Glass>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  close: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF4E2", alignItems: "center", justifyContent: "center", ...shadow },
  plaque: { width: 240, height: 80, alignItems: "center", justifyContent: "center", paddingHorizontal: 50 },
  levelPill: { marginTop: -16, paddingHorizontal: 14, paddingVertical: 2, borderRadius: 10, backgroundColor: "#F6E2BC", borderWidth: 1.5, borderColor: "#D9AE6E" },
  moves: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: "#2F3A78", borderWidth: 1.5, borderColor: "#5463B8" },
  order: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, alignSelf: "center", paddingVertical: 4, paddingRight: 14, paddingLeft: 6, borderRadius: 16, backgroundColor: "#FFF4E2", borderWidth: 1.5, borderColor: "#E2B878", minWidth: 200 },
  dot: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  status: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(60,32,18,0.72)", borderWidth: 1, borderColor: "rgba(255,220,170,0.35)" },
});
