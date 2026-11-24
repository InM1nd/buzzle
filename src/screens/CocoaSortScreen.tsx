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
import { C, F, isNight, K, shadow, themed } from "../ui/theme";

/* eslint-disable @typescript-eslint/no-require-imports */
const BG = require("../../assets/art/cocoa/background_cafe_winter.webp");
const MUG = require("../../assets/art/cocoa/mug_glass.webp");
const SHELF = require("../../assets/art/cocoa/shelf_wood.webp");
const UNDO = require("../../assets/art/cocoa/icon_undo.webp");
const ADD = require("../../assets/art/cocoa/icon_add_mug.webp");
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
const LIFT = 16; // a picked mug rises this much; the pour starts from there

interface Play { board: Board; par: number; moves: number; undos: number; added: boolean; history: { board: Board; moves: number }[] }
const fresh = (n: number): Play => { const { n: _n, par, colors: _c, ...board } = levelAt(n); return { board, par, moves: 0, undos: UNDOS, added: false, history: [] }; };
/** the first level of each twist explains it once */
const INTRO: Record<number, "cs.newOrders" | "cs.newFoam" | "cs.newIce"> = { 2: "cs.newOrders", 4: "cs.newFoam", 8: "cs.newIce" };

/** no legal pour at all (ice may still melt only by pouring, so a frozen board with no pours is stuck too) */
const stuck = (b: Board) => !b.cups.some((_, f) => b.cups.some((__, to) => pour(b, f, to)));

interface Geo { cw: number; ch: number; pos: { x: number; y: number }[]; shelves: { y: number; x: number; w: number }[]; h: number; w: number }
/** vessel_layout.json (1024 space): liquid box x 234–716, fill 165–898, the mug stands on y 969, topping anchor (473, 142),
 *  rim centre y 111, pour spouts (230 | 714, 114) */
const V = {
  x0: 234 / 1024, x1: 716 / 1024, top: 165 / 1024, bottom: 898 / 1024, foot: 969 / 1024, topX: 473 / 1024, topY: 142 / 1024,
  rimY: 111 / 1024, spL: 230 / 1024, spR: 714 / 1024, spY: 114 / 1024,
};
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
  return { cw, ch, pos, shelves, h: rows * rowH + 14, w: W };
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
function Glass({ w, h, children }: { w: number; h: number; children?: React.ReactNode }) {
  const i = inner(w, h);
  return (
    <View style={{ width: w, height: h }}>
      <View style={{ position: "absolute", left: i.left, right: i.right, top: i.top, bottom: i.bottom, overflow: "hidden", borderBottomLeftRadius: w * 0.07, borderBottomRightRadius: w * 0.07 }}>
        {children}
      </View>
      <Image source={MUG} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} />
    </View>
  );
}

/** a mug on the shelf. `extra` is a block of drink being poured in (animated height). */
function Mug({ cup, hidden, ice, w, h, selected, extra, onPress, index, shake }: {
  cup: Cup; hidden: number; ice: number; w: number; h: number; selected: boolean; index: number; shake: number;
  extra?: { color: number; h: Animated.AnimatedInterpolation<number> | Animated.Value }; onPress: () => void;
}) {
  const i = inner(w, h);
  const done = complete(cup);
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(lift, { toValue: selected ? -LIFT : 0, useNativeDriver: true, speed: 22, bounciness: 7 }).start(); }, [selected, lift]);
  // a drink that just got finished: its topping drops in and the mug hops
  const pop = useRef(new Animated.Value(done ? 1 : 0)).current;
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) { pop.setValue(0); Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }).start(); }
    if (!done) pop.setValue(0);
    wasDone.current = done;
  }, [done, pop]);
  // that won't fit: a short head shake
  const sx = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shake) return;
    sx.setValue(0);
    Animated.timing(sx, { toValue: 1, duration: 320, easing: Easing.linear, useNativeDriver: true }).start();
  }, [shake, sx]);
  const shakeX = sx.interpolate({ inputRange: [0, 0.15, 0.35, 0.55, 0.75, 1], outputRange: [0, -6, 5, -4, 2, 0] });
  const hop = pop.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, -10, 0, 0], extrapolate: "clamp" });
  const a11y = cup.length ? cup.map((c, k) => (k < hidden ? t("cs.hidden") : tx(`cs.d${c}`))).join(", ") : t("cs.empty");
  return (
    <Press onPress={onPress} scaleTo={0.97} haptic={false} accessibilityRole="button" accessibilityLabel={t("cs.mugA11y", { i: index + 1, layers: a11y })} accessibilityState={{ selected }}>
      <Animated.View style={{ transform: [{ translateX: shakeX }, { translateY: Animated.add(lift, hop) }] }}>
        <Glass w={w} h={h}>
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
        {done ? (
          <Animated.View pointerEvents="none" style={{
            position: "absolute", left: 0, top: 0, width: w, height: h, opacity: pop.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-h * 0.3, 0] }) }],
          }}>
            {TOPPER[cup[0]]
              ? <Animated.Image source={TOPPER[cup[0]]} style={{ position: "absolute", left: w * V.topX - w * 0.2, top: h * V.topY - w * 0.3, width: w * 0.4, height: w * 0.4, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
              : <Image source={ART.check} style={{ position: "absolute", top: 0, left: w / 2 - 12, width: 24, height: 24 }} />}
          </Animated.View>
        ) : null}
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
  const [shk, setShk] = useState({ i: -1, n: 0 });
  const shakeMug = (i: number) => setShk((v) => ({ i, n: v.n + 1 }));
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
    if (b.ice[i] > 0) { hError(); shakeMug(i); setMsg(t("cs.hintIce", { n: b.ice[i] })); return; }
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
      hError(); shakeMug(i); setMsg(t("cs.hintNo")); return;
    }
    setSel(null); setMsg(t("cs.hintPick"));
    // the board shows the cups as they were while the copy pours; the target's top shows the source's colour block growing
    const pr: Pouring = { from: sel, to: i, count: m.count, color: m.color, before: b, after: m.board };
    if (reduce) { finishPour(pr); return; }
    setPouring(pr);
    p.setValue(0);
    // easing is baked into the pour track (usePourTrack), the clock runs linearly
    Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(p, { toValue: 2, duration: 480 + 170 * m.count, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(p, { toValue: 3, duration: 380, easing: Easing.linear, useNativeDriver: false }),
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

  // the win card waits a moment so the last topping can land
  const wonNow = !!board && isWon(board);
  const [winUp, setWinUp] = useState(false);
  useEffect(() => {
    if (!wonNow || pouring) { setWinUp(false); return; }
    const id = setTimeout(() => setWinUp(true), reduce ? 0 : 800);
    return () => clearTimeout(id);
  }, [wonNow, pouring, reduce]);

  if (n === null || !play || !board) return <View style={{ flex: 1, backgroundColor: "#3B2418" }} />;
  const won = isWon(board);
  const st = stars(play.moves, play.par);

  return (
    <View style={{ flex: 1 }}>
      <Image source={BG} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(40,22,14,0.12)" }]} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingHorizontal: 12 }}>
        {/* top bar: the same panel as the puzzle (GameScreen): exit · title and level · moves; stars and what keeps them */}
        <View style={ui.hud}>
          <View style={ui.top}>
            <Press onPress={leave} style={ui.iconBtn} accessibilityRole="button" accessibilityLabel={t("game.exit")}>
              <Image source={ART.close} style={{ width: 16, height: 16, tintColor: C.brown }} />
            </Press>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Txt v="tiny" color={C.dim}>{t("cs.title").toUpperCase()}</Txt>
              <Text style={[F.black, { fontSize: 26, lineHeight: 30, color: C.text }]} numberOfLines={1}>{t("cs.level", { n: n + 1 })}</Text>
            </View>
            <View style={ui.moves} accessibilityLabel={t("cs.moves", { n: play.moves })}>
              <Text style={[F.black, { fontSize: 22, lineHeight: 25, color: isNight() ? "#4A2C12" : "#fff" }]}>{play.moves}</Text>
              <Text style={[F.xbold, { fontSize: 9, lineHeight: 11, color: isNight() ? "#4A2C12" : "#fff", opacity: 0.9 }]}>{t("game.movesCaps")}</Text>
            </View>
          </View>
          <View style={ui.starRow}>
            <Stars n={st} size={20} />
            <Txt v="tiny" color={C.dim}>{st > 1 ? t("cs.starsKeep", { s: st, n: play.par + (st === 3 ? 3 : 8) }) : t("cs.starsLast")}</Txt>
          </View>
        </View>

        {/* Zhuzha's order ticket */}
        {shape(n).orders ? (
          <View style={ui.order}>
            <Mascot size={40} />
            <View style={{ flex: 1 }}>
              <Txt v="tiny" color={C.dim}>{t("cs.order")}</Txt>
              {board.orders.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: DRINK[board.orders[0]] }]}><Text style={[F.black, { fontSize: 11, color: GLYPH_ON[board.orders[0]] }]}>{GLYPH[board.orders[0]]}</Text></View>
                  <Txt v="h3" style={{ fontSize: 14 }}>{tx(`cs.d${board.orders[0]}`)}</Txt>
                  {board.orders.length > 1 ? <Txt v="tiny" color={C.dim}>{` +${board.orders.length - 1}`}</Txt> : null}
                </View>
              ) : <Txt v="h3" style={{ fontSize: 14 }} color={C.greenDark}>{t("cs.ordersDone")}</Txt>}
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
                const full = pr ? pr.count * inner(geo.cw, geo.ch).u : 0;
                // the target's new block grows a moment after the stream starts (same timing as the stream in usePourTrack)
                const extra = pr && pr.to === i ? { color: pr.color, h: p.interpolate({ inputRange: [0, 1.08, 1.95, 3], outputRange: [0, 0, full, full], extrapolate: "clamp" }) } : undefined;
                return (
                  <View key={i} style={{ position: "absolute", left: geo.pos[i].x, top: geo.pos[i].y, opacity: pr && pr.from === i ? 0 : 1 }}>
                    <Mug cup={shown.cups[i]} hidden={shown.hidden[i]} ice={shown.ice[i]} w={geo.cw} h={geo.ch} index={i}
                      selected={sel === i} extra={extra} onPress={() => choose(i)} shake={shk.i === i ? shk.n : 0} />
                  </View>
                );
              })}
              {pouring ? <Flying pr={pouring} geo={geo} p={p} /> : null}
            </View>
          ) : null}
        </View>

        {/* fixed height: a longer hint must not change the shelf area (its height sizes the mugs) */}
        <View style={{ height: 52, alignItems: "center", justifyContent: "center" }}>
          <View style={ui.chip}><Txt v="small" center numberOfLines={2}>{msg}</Txt></View>
        </View>
        {/* tools: cards like the puzzle's hint card, restart as the small white button (like shuffle) */}
        <View style={ui.dock}>
          <Tool icon={UNDO} title={t("cs.undoT")} sub={t("cs.left", { n: play.undos })} color={K.bg("#E8E2FF")} label={t("cs.undo", { n: play.undos })}
            off={!play.undos || !play.history.length || !!pouring} onPress={undo} />
          <Tool icon={ADD} title={t("cs.addMugT")} sub={t("cs.left", { n: play.added ? 0 : 1 })} color={K.bg("#FFE3B0")} label={t("cs.addMug", { n: play.added ? 0 : 1 })}
            off={play.added || won || !!pouring} onPress={addMug} />
        </View>
        <GameButton small color="white" title={`↻  ${t("cs.restart")}`} onPress={restart} style={{ alignSelf: "center", marginTop: 10 }} />
      </View>

      <Overlay visible={won && !pouring && winUp} dismissable={false} glow>
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

/* ── the pour ──────────────────────────────────────────────────────────────────────────────────────────────────────
 * Everything is a function of the progress q: 0–1 the lifted mug flies over the target on a small arc and starts tilting,
 * 1–2 it pours, 2–3 it flies back. Poses are computed in JS and sampled into keyframes for Animated.
 * The liquid keeps its volume: the surface in the tilted glass is the horizontal line under which the glass box holds the
 * drink (polygon clipping), and while pouring the tilt is the one at which the remaining drink just reaches the lip, so
 * the stream always leaves from the drink's surface. The spout (vessel_layout pourSpoutLeft/Right) stays over the target. */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = (a: number, b: number, q: number) => clamp01((q - a) / (b - a));
const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2);
const rotP = (x: number, y: number, th: number) => ({ x: x * Math.cos(th) - y * Math.sin(th), y: x * Math.sin(th) + y * Math.cos(th) });
type Pt = { x: number; y: number };
/** area of the polygon below the horizontal line y = c (screen y grows down) */
function areaBelow(poly: Pt[], c: number) {
  const out: Pt[] = [];
  poly.forEach((a, k) => {
    const b = poly[(k + 1) % poly.length];
    if (a.y >= c) out.push(a);
    if (a.y >= c !== b.y >= c) out.push({ x: a.x + ((c - a.y) / (b.y - a.y)) * (b.x - a.x), y: c });
  });
  let s = 0;
  out.forEach((a, k) => { const b = out[(k + 1) % out.length]; s += a.x * b.y - b.x * a.y; });
  return Math.abs(s) / 2;
}
const STEPS = 20; // keyframes per phase

function usePourTrack(pr: Pouring, geo: Geo) {
  return useMemo(() => {
    const s = geo.cw; // a mug cell is square
    const src = geo.pos[pr.from], dst = geo.pos[pr.to];
    const i = inner(s, s);
    const hw = (s * (V.x1 - V.x0)) / 2, hh = (CAP * i.u) / 2; // the liquid box, centred on its own centre
    const W = 2 * hw;
    const box = (th: number) => [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => rotP(x, y, th));
    /** the surface (relative to the box centre) under which the tilted box holds `vol` layers */
    const level = (th: number, vol: number) => {
      const poly = box(th), ys = poly.map((q) => q.y), need = vol * i.u * W;
      let lo = Math.min(...ys), hi = Math.max(...ys);
      if (vol <= 0) return hi;
      for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (areaBelow(poly, m) > need) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    /** the tilt at which `vol` layers just reach the lip on the pouring side */
    const reach = (vol: number, dir: number) => {
      let lo = 0, hi = 1.45;
      for (let k = 0; k < 16; k++) {
        const m = (lo + hi) / 2, th = dir * m;
        if (areaBelow(box(th), rotP(dir * hw, -hh, th).y) > vol * i.u * W) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    };
    const cup = pr.before.cups[pr.from], keep = cup.length - pr.count;
    const aS = Math.max(0.5, reach(cup.length, -1)), aE = Math.max(aS + 0.15, reach(keep, -1));
    // the spout stays over the target's mouth, a bit above its rim
    const P = { x: dst.x + (s * (V.x0 + V.x1)) / 2, y: dst.y + s * (V.rimY - 0.07) };
    const spout = (dir: number) => ({ x: s * ((dir < 0 ? V.spL : V.spR) - 0.5), y: s * (V.spY - 0.5) });
    const pose = (a: number, dir: number) => { const r = rotP(spout(dir).x, spout(dir).y, dir * a); return { x: P.x - r.x, y: P.y - r.y }; };
    // pour over the left rim (the handle side goes up, the mug hangs right of the target); mirrored when there's no room
    const dir = Math.max(pose(aS, -1).x, pose(aE, -1).x) + s * 0.42 > geo.w ? 1 : -1;
    const a0 = dir < 0 ? aS : Math.max(0.5, reach(cup.length, 1));
    const a1 = Math.min(1.45, Math.max(a0, reach(keep, dir))); // the tilt the pour ends with, where the way back starts
    const rest = { x: src.x + s / 2, y: src.y + s / 2 }, lifted = { x: rest.x, y: rest.y - LIFT };
    const vol = (q: number) => (q <= 1 ? cup.length : q <= 2 ? keep + pr.count * (1 - span(1, 1.9, q)) : keep);
    const tilt = (q: number) => q <= 1 ? a0 * easeIO(span(0.15, 1, q))
      : q <= 2 ? Math.min(1.45, Math.max(a0, reach(vol(q), dir)))
      : a1 * (1 - easeIO(span(2, 2.7, q)));
    const centre = (q: number, a: number) => {
      if (q > 1 && q <= 2) return pose(a, dir);
      const [from, to, e, arc] = q <= 1 ? [lifted, pose(a0, dir), easeIO(q), s * 0.22] : [pose(a1, dir), rest, easeIO(q - 2), s * 0.12];
      return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - arc * Math.sin(Math.PI * e) };
    };
    // the target: its new block grows a moment after the stream starts; surface in board coordinates
    const nTo = pr.before.cups[pr.to].length;
    const fillAt = (q: number) => pr.count * i.u * span(1.08, 1.95, q);
    const surface = (q: number) => dst.y + s - i.bottom - nTo * i.u - fillAt(q);

    const qs = Array.from({ length: 3 * STEPS + 1 }, (_, k) => k / STEPS);
    const frames = qs.map((q) => {
      const a = tilt(q), th = dir * a, c = centre(q, a), v = vol(q), sf = surface(q);
      return {
        rot: (th * 180) / Math.PI, x: c.x - rest.x, y: c.y - rest.y,
        // layer tops (relative to the box centre): the poured block, then the kept ones from the top down
        tops: [level(th, v), ...Array.from({ length: keep }, (_, j) => level(th, keep - j))],
        streamTop: P.y + (sf - P.y) * span(1.9, 1.98, q), streamBot: P.y + (sf - P.y) * span(1, 1.08, q), surface: sf,
      };
    });
    const track = (get: (f: (typeof frames)[number]) => number) => ({ inputRange: qs, outputRange: frames.map(get), extrapolate: "clamp" as const });
    const deg = (get: (f: (typeof frames)[number]) => number) => ({ inputRange: qs, outputRange: frames.map((f) => `${get(f)}deg`), extrapolate: "clamp" as const });
    return { s, hh, P, keep, cup, track, deg };
  }, [pr, geo]);
}

/** the lifted copy of the source mug and the stream */
function Flying({ pr, geo, p }: { pr: Pouring; geo: Geo; p: Animated.Value }) {
  const { s, hh, P, keep, cup, track, deg } = usePourTrack(pr, geo);
  const src = geo.pos[pr.from];
  const sw = Math.max(5, s * 0.065);
  const sTop = p.interpolate(track((f) => f.streamTop));
  const sH = p.interpolate(track((f) => Math.max(0, f.streamBot - f.streamTop)));
  const on = p.interpolate({ inputRange: [0, 0.98, 1, 2, 2.02, 3], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" });
  const ripple = p.interpolate({ inputRange: [0, 1.08, 1.2, 1.85, 1.98, 3], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" });
  // the liquid box inside the counter-rotated frame: its centre sits at (s, s + hh) of the oversized frame
  const top = (k: number) => p.interpolate(track((f) => s + hh + f.tops[k]));
  return (
    <>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: P.x - sw / 2, top: sTop, width: sw, height: sH, borderRadius: sw / 2, backgroundColor: DRINK[pr.color], opacity: on, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: sw * 0.22, top: 0, bottom: 0, width: sw * 0.22, borderRadius: sw, backgroundColor: "rgba(255,255,255,0.4)" }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: P.x - s * 0.17, width: s * 0.34, height: s * 0.07, borderRadius: s, backgroundColor: "rgba(255,255,255,0.4)", opacity: ripple, transform: [{ translateY: p.interpolate(track((f) => f.surface - s * 0.035)) }] }} />
      <Animated.View pointerEvents="none" style={{
        position: "absolute", left: src.x, top: src.y, ...shadow, shadowOpacity: 0.3, shadowRadius: 14,
        transform: [{ translateX: p.interpolate(track((f) => f.x)) }, { translateY: p.interpolate(track((f) => f.y)) }, { rotate: p.interpolate(deg((f) => f.rot)) }],
      }}>
        <Glass w={s} h={s}>
          {/* screen-aligned frame (counter-rotated about the liquid box centre): horizontal bands, each from its top down */}
          <Animated.View style={{ position: "absolute", left: -s, right: -s, top: -s, bottom: -s, transform: [{ rotate: p.interpolate(deg((f) => -f.rot)) }] }}>
            <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: top(0), backgroundColor: DRINK[pr.color] }} />
            {Array.from({ length: keep }, (_, j) => {
              const c = keep - 1 - j; // kept layer index from the bottom
              return <Animated.View key={j} style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: top(j + 1), backgroundColor: c < pr.before.hidden[pr.from] ? FOAM : DRINK[cup[c]], borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.35)" }} />;
            })}
          </Animated.View>
        </Glass>
      </Animated.View>
    </>
  );
}

/** a tool card (undo / one more mug), the puzzle's dock card */
function Tool({ icon, title, sub, color, label, off, onPress }: { icon: number; title: string; sub: string; color: string; label: string; off: boolean; onPress: () => void }) {
  return (
    <Press onPress={off ? undefined : onPress} disabled={off} style={[ui.dockCard, off && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off }}>
      <View style={[ui.dockIc, { backgroundColor: color }]}><Image source={icon} style={{ width: 26, height: 26, tintColor: C.brown }} /></View>
      <View style={{ flex: 1 }}>
        <Txt v="h3" style={{ fontSize: 14 }} numberOfLines={1}>{title}</Txt>
        <Txt v="tiny" color={C.dim} numberOfLines={1}>{sub}</Txt>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  dot: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});
/** the puzzle's panels and cards (GameScreen styles), themed for the Midnight look */
const ui = themed(() => StyleSheet.create({
  hud: { backgroundColor: K.bg("rgba(255,250,238,0.95)"), borderRadius: 24, padding: 8, paddingBottom: 8, borderWidth: 2, borderColor: K.bd("rgba(255,255,255,0.9)"), ...shadow },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: K.bg("#FFF0D2"), alignItems: "center", justifyContent: "center" },
  moves: { width: 56, height: 48, borderRadius: 16, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center" },
  starRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 },
  order: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, alignSelf: "center", paddingVertical: 4, paddingRight: 14, paddingLeft: 6, borderRadius: 18, backgroundColor: K.bg("#fff"), borderWidth: 2, borderColor: C.line, minWidth: 200, ...shadow },
  chip: { backgroundColor: K.bg("#fff"), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, maxWidth: "100%", ...shadow, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  dock: { flexDirection: "row", gap: 10 },
  dockCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: K.bg("#fff"), borderRadius: 18, borderWidth: 2, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 8, minHeight: 56 },
  dockIc: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
}));
