import { t } from "../i18n";
import { colorName } from "../logic/bees";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useInsets } from "../platform/insets";
import { addBackListener } from "../platform/back";
import {
  applyPath, Board, Cell, createBoard, shuffleBoard, findBestPath, isJoker, isValidPath, MoveResult, pathColor, PuzzleRules, stepPath,
} from "../logic/board";
import { POINTS } from "../logic/event";
import { boardSize, cellCenter, COLS, fitStretch, hitTest, Pos, ROWS, tileSize } from "../logic/hex";
import { DAILY_STARS, starsFor, WEEKEND_STARS } from "../logic/day";
import { BOX_INFO } from "../logic/loot";
import { boxArt } from "../ui/lootUi";
import { RoundMode, RoundReward, RoundSummary } from "../logic/game";
import { ART } from "../ui/art";
import { BeeSprite } from "../ui/BeeSprite";
import { C, F, shadow } from "../ui/theme";
import { Bar, CountUp, fmt, GameButton, Overlay, Press, Stars, Txt } from "../ui/components";
import { hError, hHeavy, hLight, hSuccess, hTick } from "../ui/haptics";

const SQ3 = Math.sqrt(3);
const PATH_COLORS = ["#E39A00", "#E04585", "#7A4FD6", "#1F7FE0", "#25A35C"];

interface Props {
  mode: RoundMode;
  /** v1.3 free-play boosters */
  startBomb?: boolean;
  shuffles?: number;
  onShuffle?: () => boolean;
  seed: number;
  moves: number;
  rules: PuzzleRules;
  best: number;
  title: string;
  onFinish: (r: RoundSummary) => RoundReward;
  onExit: () => void;
  onReplay: () => void;
  /** owned bees: one of them zips across the board on big combos */
  beeIds?: string[];
  beeLevels?: Record<string, number>;
  /** colour of the day (×1.5) and whether the garden has switched its bonus on */
  dayColor?: { color: number; active: boolean };
  /** v1.6: dark Halloween backdrop behind the screen: light text where it sits right on the backdrop */
  night?: boolean;
}

// ---------- cell ----------
const CellView = React.memo(function CellView(p: {
  cell: Cell; x: number; y: number; startY: number; delay: number; s: number; k: number; selected: boolean; dim: boolean; hint: boolean; pulse: number;
}) {
  const ty = useRef(new Animated.Value(p.startY)).current;
  const sc = useRef(new Animated.Value(1)).current;
  const hint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.spring(ty, { toValue: p.y, useNativeDriver: true, speed: 13, bounciness: 7 }),
    ]).start();
  }, [p.y, p.delay, ty]);
  useEffect(() => {
    Animated.spring(sc, { toValue: p.selected ? 1.06 : 1, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
  }, [p.selected, sc]);
  useEffect(() => {
    if (!p.pulse) return;
    sc.setValue(0.6);
    Animated.spring(sc, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
  }, [p.pulse, sc]);
  useEffect(() => {
    if (!p.hint) { hint.stopAnimation(); hint.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(hint, { toValue: 1, duration: 420, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(hint, { toValue: 0, duration: 420, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ]));
    l.start();
    return () => l.stop();
  }, [p.hint, hint]);
  const { w, h } = tileSize(p.s, p.k);
  const src = cellArt(p.cell.kind, p.cell.color);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: p.x - w / 2, top: -h / 2, width: w, height: h, opacity: p.dim ? 0.5 : 1,
        transform: [{ translateY: ty }, { scale: Animated.add(sc, hint.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] })) }],
      }}
    >
      <Image source={src} resizeMode="stretch" style={{ width: w, height: h }} />
      {p.cell.kind === "bomb" ? <Image source={ART.bomb} resizeMode="stretch" style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} /> : null}
      {p.cell.ghost ? <Ghost w={w} h={h} /> : null}
      {p.selected ? <Image source={src} resizeMode="stretch" style={{ position: "absolute", left: 0, top: 0, width: w, height: h, tintColor: "#fff", opacity: 0.22 }} /> : null}
    </Animated.View>
  );
});

const cellArt = (kind: Cell["kind"], color: number) => (kind === "wild" ? ART.wild : kind === "pumpkin" ? ART.pumpkin : ART.cells[color]);

/** v1.6 event ghost: floats and sways over its cell */
function Ghost({ w, h }: { w: number; h: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(a, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ]));
    l.start();
    return () => l.stop();
  }, [a]);
  return (
    <Animated.Image source={ART.ghost} resizeMode="stretch" style={{
      position: "absolute", left: 0, top: 0, width: w, height: h,
      transform: [
        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [h * 0.03, -h * 0.07] }) },
        { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] }) },
      ],
    }} />
  );
}

// ---------- effects ----------
interface PopFx { key: number; x: number; y: number; color: number; kind: Cell["kind"]; delay: number; s: number; k: number }
function Pop({ fx, onDone }: { fx: PopFx; onDone: (k: number) => void }) {
  const a = useRef(new Animated.Value(0)).current;
  const parts = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const ang = (i / 5) * Math.PI * 2 + Math.random() * 0.9;
    const d = fx.s * (0.9 + Math.random() * 0.9);
    return { dx: Math.cos(ang) * d, dy: Math.sin(ang) * d - fx.s * 0.3, r: 4 + Math.random() * 4 };
  }), [fx.s]);
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 520, delay: fx.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone(fx.key));
  }, [a, fx, onDone]);
  const { w, h } = tileSize(fx.s, fx.k);
  const col = C.pollen[fx.color];
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: fx.x, top: fx.y }}>
      <Animated.Image
        resizeMode="stretch"
        source={cellArt(fx.kind, fx.color)}
        style={{
          position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h,
          opacity: a.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 1.25, 0.2] }) }],
        }}
      />
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute", left: -p.r, top: -p.r, width: p.r * 2, height: p.r * 2, borderRadius: p.r,
            backgroundColor: i % 2 ? col : "#FFE9A8",
            opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function FloatText({ x, y, text, color, big, onDone, id }: { x: number; y: number; text: string; color: string; big?: boolean; id: number; onDone: (id: number) => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: big ? 1100 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => onDone(id));
  }, [a, big, id, onDone]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: x - 120, top: y - 20, width: 240, alignItems: "center",
      opacity: a.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, big ? -30 : -50] }) },
        { scale: a.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.4, big ? 1.25 : 1.15, 1, 1] }) },
      ],
    }}>
      <Text style={[F.black, styles.floatText, { color, fontSize: big ? 34 : 24 }]}>{text}</Text>
    </Animated.View>
  );
}

// ---------- screen ----------
/** A bee zipping across the board along a wavy line, leaving a sparkle trail (one native timing). */
function ZipBee({ id, w, h, dir, y0, big, level = 1, onEnd }: { id: string; w: number; h: number; dir: 1 | -1; y0: number; big: boolean; level?: number; onEnd: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  const size = Math.round(Math.min(64, Math.max(44, w * 0.13)));
  const end = useRef(onEnd);
  end.current = onEnd;
  const look = useRef(new Animated.Value(dir * size * 0.04)).current;
  useEffect(() => {
    const t = Animated.timing(a, { toValue: 1, duration: big ? 1250 : 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    t.start(({ finished }) => { if (finished) end.current(); });
    return () => t.stop();
  }, [a, big]);
  const p = useMemo(() => {
    const N = 24, waves = big ? 2.5 : 1.5, amp = h * (big ? 0.16 : 0.1);
    const t: number[] = [], x: number[] = [], y: number[] = [], rot: string[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const px = dir > 0 ? -size + (w + 2 * size) * u : w + size - (w + 2 * size) * u;
      const ph = Math.PI * 2 * waves * u;
      t.push(u); x.push(px); y.push(y0 + Math.sin(ph) * amp);
      const slope = (Math.cos(ph) * amp * Math.PI * 2 * waves) / (w + 2 * size);
      rot.push(`${(Math.atan(slope) * 180 / Math.PI * dir * 0.8).toFixed(1)}deg`);
    }
    return { t, x, y, rot };
  }, [w, h, dir, y0, big, size]);
  const trail = [0.05, 0.1, 0.15, 0.2, 0.26];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {trail.map((d, k) => (
        <Animated.Image key={k} source={ART.star} style={{
          position: "absolute", left: -8, top: -8, width: 16, height: 16,
          opacity: a.interpolate({ inputRange: [0, d, d + 0.02, 0.92, 1], outputRange: [0, 0, 0.9 - k * 0.14, 0.5, 0], extrapolate: "clamp" }),
          transform: [
            { translateX: a.interpolate({ inputRange: p.t.map((u) => u + d), outputRange: p.x, extrapolate: "clamp" }) },
            { translateY: a.interpolate({ inputRange: p.t.map((u) => u + d), outputRange: p.y.map((v, i) => v + size * 0.12 + (i % 2 ? 4 : -4)), extrapolate: "clamp" }) },
            { scale: 1 - k * 0.13 },
            { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${dir * 300}deg`] }) },
          ],
        }} />
      ))}
      <Animated.View style={{
        position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size,
        transform: [
          { translateX: a.interpolate({ inputRange: p.t, outputRange: p.x }) },
          { translateY: a.interpolate({ inputRange: p.t, outputRange: p.y }) },
          { rotate: a.interpolate({ inputRange: p.t, outputRange: p.rot }) },
        ],
      }}>
        <BeeSprite id={id} size={size} seed={2} face={{ lookX: look }} turn={dir * 0.85} level={level} />
      </Animated.View>
    </View>
  );
}

export default function GameScreen(props: Props) {
  const { width: winW, height } = useWindowDimensions();
  const [containerW, setContainerW] = useState(winW);
  const insets = useInsets();
  // board wrap adds 6px padding + 3px border on each side; keep 12px air to the screen edge
  const avail = Math.max(1, Math.min(containerW - 42, 560));
  const sByW = avail / (1.5 * COLS + 0.5);
  const availH = height - insets.top - insets.bottom - 190;
  const sByH = availH / (SQ3 * (ROWS + 0.5));
  const s = Math.max(20, Math.min(sByW, sByH));
  // spare vertical room (tall phones) → stretch the lattice a little so the tiles are not squat
  const k = s < sByW ? 1 : fitStretch(s, availH);
  const size = boardSize(s, COLS, ROWS, k);
  const H = SQ3 * s * k;

  const [board, setBoard] = useState<Board>(() => {
    const b = createBoard(props.seed, props.rules);
    if (!props.startBomb) return b;
    const c = Math.floor(COLS / 2), r = Math.floor(ROWS / 2);
    const cells = b.cells.map((col) => col.slice());
    cells[c][r] = { ...cells[c][r], kind: "bomb" };
    return { ...b, cells };
  });
  const [path, setPath] = useState<Pos[]>([]);
  const [movesLeft, setMovesLeft] = useState(props.moves);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [zips, setZips] = useState<{ key: number; id: string; dir: 1 | -1; y0: number; big: boolean }[]>([]);
  const zipId = useRef(1);
  const [pops, setPops] = useState<PopFx[]>([]);
  const [texts, setTexts] = useState<{ id: number; x: number; y: number; text: string; color: string; big?: boolean }[]>([]);
  const [hint, setHint] = useState<Pos[]>([]);
  const [pulse, setPulse] = useState(0);
  const [quitAsk, setQuitAsk] = useState(false);
  const [result, setResult] = useState<{ reward: RoundReward; score: number } | null>(null);
  const [starsNow, setStarsNow] = useState(0);
  const [dockH, setDockH] = useState(0);
  const narrow = size.width < 335;
  const tile = tileSize(s, k);

  const summary = useRef<RoundSummary>({ mode: props.mode, score: 0, chains: [], bombs: 0, cellsByColor: [0, 0, 0, 0, 0], pumpkins: 0, ghosts: 0 });
  const [evPoints, setEvPoints] = useState(0);
  const eventOn = !!props.rules.ghost;
  const prevPos = useRef(new Map<number, number>()); // cell id -> last y
  const first = useRef(true);
  const busy = useRef(false);
  const fxId = useRef(1);
  const shake = useRef(new Animated.Value(0)).current;
  const movesPulse = useRef(new Animated.Value(1)).current;
  const pathRef = useRef<Pos[]>([]);
  const boardRef = useRef(board);
  boardRef.current = board;
  const finished = movesLeft <= 0 || !!result;
  const finishedRef = useRef(false);
  finishedRef.current = finished || quitAsk;
  const offset = useRef({ x: 0, y: 0 });

  // ----- layout of cells (start positions for fall animation) -----
  const layout = useMemo(() => {
    const out: { cell: Cell; c: number; r: number; x: number; y: number; startY: number; delay: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      let fresh = 0;
      for (let r = 0; r < ROWS; r++) if (!prevPos.current.has(board.cells[c][r].id)) fresh++;
      for (let r = 0; r < ROWS; r++) {
        const cell = board.cells[c][r];
        const { x, y } = cellCenter(c, r, s, k);
        const prev = prevPos.current.get(cell.id);
        let startY: number, delay: number;
        if (first.current) {
          startY = y - size.height - H;
          delay = c * 40 + (ROWS - r) * 25;
        } else if (prev === undefined) {
          startY = y - fresh * H - H * 0.6;
          delay = 90 + (ROWS - r) * 18;
        } else {
          startY = prev;
          delay = prev === y ? 0 : 60 + (ROWS - r) * 12;
        }
        out.push({ cell, c, r, x, y, startY, delay });
      }
    }
    return out;
  }, [board, s, k, size.height, H]);
  useEffect(() => {
    const m = new Map<number, number>();
    layout.forEach((l) => m.set(l.cell.id, l.y));
    prevPos.current = m;
    first.current = false;
  }, [layout]);

  // empty sockets under the tiles: the board keeps its honeycomb structure while tiles fall
  const slots = useMemo(() => {
    const out: { k: number; x: number; y: number }[] = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const p = cellCenter(c, r, s, k); out.push({ k: c * 100 + r, x: p.x, y: p.y }); }
    return out;
  }, [s, k]);

  // ----- hint after idle -----
  useEffect(() => {
    setHint([]);
    if (finished || path.length) return;
    const t = setTimeout(() => {
      const best = findBestPath(boardRef.current, 6, 3000);
      if (best.length >= 3) setHint(best.slice(0, Math.min(best.length, 5)));
    }, 6500);
    return () => clearTimeout(t);
  }, [board, finished, path.length]);

  const addText = useCallback((x: number, y: number, text: string, color: string, big?: boolean) => {
    const id = fxId.current++;
    setTexts((t) => [...t, { id, x, y, text, color, big }]);
  }, []);
  const removeText = useCallback((id: number) => setTexts((t) => t.filter((x) => x.id !== id)), []);
  const removePop = useCallback((k: number) => setPops((p) => p.filter((x) => x.key !== k)), []);

  // ----- commit a chain -----
  const commit = useCallback((p: Pos[]) => {
    const b = boardRef.current;
    if (!isValidPath(b, p)) {
      if (p.length > 0) hError();
      return;
    }
    const comboNow = combo;
    const res: MoveResult = applyPath(b, p, props.rules, comboNow);
    busy.current = true;
    setTimeout(() => { busy.current = false; }, 260);

    // effects
    const newPops: PopFx[] = res.removed.map((rm, i) => {
      const { x, y } = cellCenter(rm.pos.c, rm.pos.r, s, k);
      const idx = p.findIndex((q) => q.c === rm.pos.c && q.r === rm.pos.r);
      return { key: fxId.current++, x, y, color: rm.cell.color, kind: rm.cell.kind, s, k, delay: rm.blast ? 120 + (i % 6) * 15 : Math.max(0, idx) * 22 };
    });
    setPops((old) => [...old, ...newPops]);
    const last = p[p.length - 1];
    const lc = cellCenter(last.c, last.r, s, k);
    const col = res.color ?? 0;
    addText(lc.x, lc.y - H * 0.4, `+${res.score}`, PATH_COLORS[col]);
    const len = p.length;
    if (res.bombsExploded) {
      addText(size.width / 2, size.height * 0.42, res.bombsExploded > 1 ? t("game.boomN", { n: res.bombsExploded }) : t("game.boom"), "#B44DD8", true);
      hHeavy();
      Animated.sequence([6, -6, 4, -3, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
    } else if (len >= 10) { addText(size.width / 2, size.height * 0.42, t("game.honeyBlast"), C.honeyDeep, true); hSuccess(); }
    else if (len >= 8) { addText(size.width / 2, size.height * 0.42, t("game.amazing"), C.honeyDeep, true); hSuccess(); }
    else if (len >= 6) { addText(size.width / 2, size.height * 0.42, t("game.great"), C.honeyDeep, true); hSuccess(); }
    else hLight();
    if (len >= 6 || res.bombsExploded) {
      const ids = props.beeIds?.length ? props.beeIds : ["zhuzha"];
      const z = { key: zipId.current++, id: ids[Math.floor(Math.random() * ids.length)], dir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1, y0: size.height * (0.25 + Math.random() * 0.45), big: len >= 10 || res.bombsExploded > 1 };
      setTimeout(() => setZips((q) => [...q.slice(-1), z]), 180);
    }
    if (res.ghostCaught) {
      const g = res.removed.find((rm) => rm.cell.ghost)!;
      const gc = cellCenter(g.pos.c, g.pos.r, s, k);
      setTimeout(() => addText(gc.x, gc.y - H * 0.2, t("game.ghost"), "#3FA88C", true), 120);
      hSuccess();
    }
    if (res.newBomb) setTimeout(() => hTick(), 300);
    if (res.shuffled) {
      setTimeout(() => { addText(size.width / 2, size.height * 0.55, t("game.shuffling"), C.brown, true); setPulse((x) => x + 1); }, 450);
    }

    // stats
    const sm = summary.current;
    sm.score += res.score;
    sm.chains.push(len);
    sm.bombs += res.bombsExploded;
    res.removed.forEach((rm) => { if (rm.cell.kind === "n") sm.cellsByColor[rm.cell.color]++; });
    sm.pumpkins! += res.pumpkins;
    if (res.ghostCaught) sm.ghosts! += 1;
    if (eventOn) setEvPoints(sm.pumpkins! * POINTS.pumpkin + sm.ghosts! * POINTS.ghost);

    setCombo(len >= 5 ? comboNow + 1 : 0);
    setScore(sm.score);
    setStarsNow(starsFor(sm.score));
    setBoard(res.board);
    setMovesLeft((m) => {
      const n = m - 1;
      if (n <= 5 && n > 0) {
        Animated.sequence([
          Animated.timing(movesPulse, { toValue: 1.25, duration: 110, useNativeDriver: true }),
          Animated.spring(movesPulse, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
        ]).start();
      }
      return n;
    });
  }, [combo, props.rules, props.beeIds, s, k, H, size.width, size.height, addText, shake, movesPulse, eventOn]);

  // ----- end of round -----
  const onFinishRef = useRef(props.onFinish);
  onFinishRef.current = props.onFinish;
  const ended = useRef(false);
  const endRound = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    const reward = onFinishRef.current({ ...summary.current });
    setResult({ reward, score: summary.current.score });
    hSuccess();
  }, []);
  useEffect(() => {
    if (movesLeft > 0 || result) return;
    const t = setTimeout(endRound, 1100);
    return () => clearTimeout(t);
  }, [movesLeft, result, endRound]);

  // hardware back: ask before leaving a running round
  const onExitRef = useRef(props.onExit);
  onExitRef.current = props.onExit;
  useEffect(() => {
    const sub = addBackListener(() => {
      if (result || movesLeft <= 0) { if (result) onExitRef.current(); return true; }
      setQuitAsk((q) => !q);
      return true;
    });
    return () => sub.remove();
  }, [result, movesLeft]);

  // ----- touch -----
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const touch = useCallback((px: number, py: number) => {
    const pos = hitTest(px - offset.current.x, py - offset.current.y, s, 0.82, k);
    if (!pos) return;
    const cur = pathRef.current;
    const next = stepPath(boardRef.current, cur, pos);
    if (next !== cur) {
      pathRef.current = next;
      setPath(next);
      hTick();
    }
  }, [s, k]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !finishedRef.current && !busy.current,
    onMoveShouldSetPanResponder: () => !finishedRef.current && !busy.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const ne = e.nativeEvent;
      offset.current = { x: ne.pageX - ne.locationX, y: ne.pageY - ne.locationY };
      pathRef.current = [];
      touch(ne.pageX, ne.pageY);
    },
    onPanResponderMove: (e) => touch(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderRelease: () => {
      const p = pathRef.current;
      pathRef.current = [];
      setPath([]);
      if (p.length) commitRef.current(p);
    },
    onPanResponderTerminate: () => { pathRef.current = []; setPath([]); },
  }), [touch]);

  // ----- derived render data -----
  const pc = path.length ? pathColor(board, path) : null;
  const selected = useMemo(() => new Set(path.map((p) => p.c * 100 + p.r)), [path]);
  const hintSet = useMemo(() => new Set(hint.map((p) => p.c * 100 + p.r)), [hint]);
  const pathPts = path.map((p) => cellCenter(p.c, p.r, s, k));
  const lineColor = PATH_COLORS[pc ?? 0];
  const chainLen = path.length;
  const preview = chainLen >= 3 ? `${chainLen}${chainLen >= props.rules.bombAt ? t("game.bombTag") : ""}` : chainLen ? `${chainLen}` : "";

  const isDaily = props.mode !== "free";
  const STARS = props.mode === "weekend" ? WEEKEND_STARS : DAILY_STARS;
  const showHint = () => {
    if (busy.current || finished || path.length) { hError(); return; }
    const best = findBestPath(boardRef.current, 6, 3000);
    if (best.length >= 3) { hLight(); setHint(best.slice(0, Math.min(best.length, 5))); } else hError();
  };
  const bestChain = summary.current.chains.reduce((m, n) => (n > m ? n : m), 0);
  const nextStar = isDaily ? STARS.find((x) => x > score) : undefined;
  const toGoal = isDaily ? (nextStar !== undefined ? nextStar - score : 0) : Math.max(0, props.best - score);
  const shuffle = () => {
    if (busy.current || finished || !props.onShuffle || !props.onShuffle()) { hError(); return; }
    hLight(); setPath([]); setHint([]);
    setBoard((b) => shuffleBoard(b));
  };
  const maxBar = isDaily ? STARS[2] * 1.12 : Math.max(props.best, 1000);
  const tooFew = path.length > 0 && path.length < 3;

  return (
    <View onLayout={(e) => setContainerW(e.nativeEvent.layout.width)} style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8 }]}>
      {/* top bar */}
      <View style={styles.top}>
        <Press onPress={() => (finished ? props.onExit() : setQuitAsk(true))} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t("game.exit")}>
          <Image source={ART.close} style={{ width: 18, height: 18, tintColor: C.brown }} />
        </Press>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt v="tiny" color={props.night ? NIGHT_DIM : C.dim}>{props.title.toUpperCase()}</Txt>
          <CountUp value={score} duration={450} style={[F.black, { fontSize: 32, lineHeight: 38, color: props.night ? "#fff" : C.text }]} />
        </View>
        <Animated.View style={[styles.moves, movesLeft <= 5 && { backgroundColor: C.red }, { transform: [{ scale: movesPulse }] }]} accessibilityLabel={t("game.movesLeft", { n: movesLeft })}>
          <Text style={[F.black, { fontSize: 24, lineHeight: 28, color: "#fff" }]}>{Math.max(0, movesLeft)}</Text>
          <Text style={[F.xbold, { fontSize: 10, lineHeight: 12, color: "#fff", opacity: 0.9 }]}>{t("game.movesCaps")}</Text>
        </Animated.View>
      </View>
      {/* score bar */}
      <View style={{ width: size.width, alignSelf: "center", marginTop: 4, marginBottom: 6 }}>
        <Bar progress={score / maxBar} height={14} color={C.honey} />
        {isDaily ? STARS.map((t, i) => (
          <View key={i} style={{ position: "absolute", left: (t / maxBar) * size.width - 11, top: -4 }}>
            <Image source={starsNow > i ? ART.star : ART.starOff} style={{ width: 22, height: 22 }} />
          </View>
        )) : props.best > 0 ? (
          <View style={{ position: "absolute", right: 6, top: -1 }}><Txt v="tiny" color={props.night ? "#FFC56B" : C.honeyDark}>{t("game.best", { n: fmt(props.best) })}</Txt></View>
        ) : null}
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.chip, { opacity: combo > 0 ? 1 : 0 }]}>
          <Image source={ART.flame} style={{ width: 18, height: 18 }} />
          <Txt v="small" color={C.honeyDark}>{t("game.combo", { x: 1 + 0.25 * combo })}</Txt>
        </View>
        {eventOn ? (
          <View style={styles.chip} accessibilityLabel={t("ev.pointsLabel", { n: evPoints })}>
            <Image source={ART.point} style={{ width: 20, height: 20 }} />
            <Txt v="small" color="#C25E00">{evPoints}</Txt>
          </View>
        ) : null}
        <View style={[styles.chip, { opacity: preview ? 1 : 0, backgroundColor: tooFew ? "#FFF" : lineColor }]}>
          <Txt v="small" color={tooFew ? C.dim : "#fff"}>{tooFew ? t("game.more", { n: 3 - path.length }) : t("game.chain", { p: preview })}</Txt>
        </View>
      </View>

      {/* board */}
      <Animated.View style={[styles.boardWrap, { width: size.width + 12, height: size.height + 12, transform: [{ translateX: shake }] }]}>
        <View
          {...responder.panHandlers}
          accessibilityLabel={t("game.board")}
          style={{ width: size.width, height: size.height, overflow: "hidden" }}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {slots.map((sl) => (
              <Image key={`slot${sl.k}`} source={ART.cells[0]} resizeMode="stretch"
                style={{ position: "absolute", left: sl.x - tile.w / 2, top: sl.y - tile.h / 2, width: tile.w, height: tile.h, tintColor: C.boardEdge, opacity: 0.35 }} />
            ))}
          </View>
          {layout.map((l) => (
            <CellView
              key={l.cell.id}
              cell={l.cell}
              x={l.x}
              y={l.y}
              startY={l.startY}
              delay={l.delay}
              s={s}
              k={k}
              selected={selected.has(l.c * 100 + l.r)}
              dim={pc !== null && !isJoker(l.cell) && l.cell.color !== pc && !selected.has(l.c * 100 + l.r)}
              hint={hintSet.has(l.c * 100 + l.r)}
              pulse={pulse}
            />
          ))}
          {/* path */}
          {pathPts.slice(1).map((b, i) => {
            const a = pathPts[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            return (
              <View key={`s${i}`} pointerEvents="none" style={{
                position: "absolute", left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 6, width: len, height: 12, borderRadius: 6,
                backgroundColor: lineColor, borderWidth: 2.5, borderColor: "#fff", transform: [{ rotate: `${ang}rad` }],
              }} />
            );
          })}
          {pathPts.map((p, i) => (
            <View key={`d${i}`} pointerEvents="none" style={{
              position: "absolute", left: p.x - (i === pathPts.length - 1 ? 10 : 7), top: p.y - (i === pathPts.length - 1 ? 10 : 7),
              width: i === pathPts.length - 1 ? 20 : 14, height: i === pathPts.length - 1 ? 20 : 14, borderRadius: 10,
              backgroundColor: lineColor, borderWidth: 3, borderColor: "#fff",
            }} />
          ))}
          {pops.map((fx) => <Pop key={fx.key} fx={fx} onDone={removePop} />)}
          {texts.map((t) => <FloatText key={t.id} {...t} onDone={removeText} />)}
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: 6, top: 6, width: size.width, height: size.height }}>
          {zips.map((z) => (
            <ZipBee key={z.key} id={z.id} w={size.width} h={size.height} dir={z.dir} y0={z.y0} big={z.big} level={props.beeLevels?.[z.id] ?? 1}
              onEnd={() => setZips((q) => q.filter((x) => x.key !== z.key))} />
          ))}
        </View>
      </Animated.View>
      {props.mode === "free" && (props.shuffles ?? 0) > 0 && !finished ? (
        <GameButton small title={t("game.shuffleN", { n: props.shuffles ?? 0 })} icon={ART.boostShuffle} color="white" onPress={shuffle} style={{ marginTop: 8, alignSelf: "center" }} label={t("game.shuffleLabel", { n: props.shuffles ?? 0 })} />
      ) : null}
      {/* leftover screen space under the board: hint · colour of the day · round stats (degrades on short screens) */}
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "center" }} onLayout={(e) => setDockH(e.nativeEvent.layout.height)}>
        {dockH >= 78 ? (
          <View style={[styles.dock, { width: size.width + 12 }]}>
            <Press onPress={showHint} style={[styles.dockCard, styles.dockHint]} accessibilityRole="button" accessibilityLabel={t("game.hintBtn")}>
              <View style={[styles.dockIc, { backgroundColor: "#FFC94A" }]}><Txt v="h2" style={{ fontSize: 22 }}>💡</Txt></View>
              <View style={{ flex: 1 }}>
                <Txt v="h3" style={{ fontSize: 14 }} numberOfLines={1}>{t("game.hintBtn")}</Txt>
                {narrow ? null : <Txt v="tiny" color={C.dim} numberOfLines={1}>{t("game.hintBtnSub")}</Txt>}
              </View>
            </Press>
            {props.dayColor ? (
              <View style={[styles.dockCard, { borderColor: props.dayColor.active ? C.pollen[props.dayColor.color] : C.line, opacity: props.dayColor.active ? 1 : 0.75 }]} accessibilityLabel={t("pz.dayColor")}>
                <Image source={ART.cells[props.dayColor.color]} style={{ width: 44, height: 38 }} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" style={{ fontSize: 14 }} numberOfLines={1}>{narrow ? t("pz.dayColor") : `${t("pz.dayColor")} ×1.5`}</Txt>
                  <Txt v="tiny" color={props.dayColor.active ? C.greenDark : C.dim} numberOfLines={1}>
                    {narrow ? (props.dayColor.active ? `×1.5 · ${colorName(props.dayColor.color)}` : "×1.5") : props.dayColor.active ? colorName(props.dayColor.color) : t("game.dayColorOff")}
                  </Txt>
                </View>
              </View>
            ) : <View style={{ flex: 1 }} />}
            {dockH >= 140 ? (
              <View style={[styles.dockCard, styles.dockStats]}>
                <View style={styles.stat}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Image source={ART.flame} style={{ width: 18, height: 18, opacity: combo > 0 ? 1 : 0.4 }} />
                    <Txt v="h3" color={C.honeyDark}>×{1 + 0.25 * combo}</Txt>
                  </View>
                  <Txt v="tiny" color={C.dim}>{t("game.statCombo")}</Txt>
                </View>
                <View style={[styles.stat, styles.statMid]}>
                  <Txt v="h3" color={C.honeyDark}>{bestChain || "–"}</Txt>
                  <Txt v="tiny" color={C.dim}>{t("game.statBest")}</Txt>
                </View>
                <View style={styles.stat}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Image source={ART.starOff} style={{ width: 18, height: 18 }} />
                    <Txt v="h3" color={C.honeyDark}>{isDaily && nextStar === undefined ? "✓" : fmt(toGoal)}</Txt>
                  </View>
                  <Txt v="tiny" color={C.dim}>{isDaily ? t("game.statToStar") : t("game.statToBest")}</Txt>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <Txt v="small" color={props.night ? NIGHT_DIM : C.dim} center style={{ marginTop: 8 }}>
            {isDaily ? t("game.hintDaily") : t("game.hintFree", { n: props.rules.bombAt })}
          </Txt>
        )}
      </View>

      {/* quit confirm */}
      <Overlay visible={quitAsk && !result} onClose={() => setQuitAsk(false)}>
        <Txt v="h2" center>{t("game.quitQ")}</Txt>
        <Txt v="body" color={C.dim} center style={{ marginTop: 6, marginBottom: 18 }}>
          {t("game.quitSub")}
        </Txt>
        <GameButton title={t("game.end")} color="honey" onPress={() => { setQuitAsk(false); endRound(); }} />
        <GameButton title={t("game.keep")} color="white" style={{ marginTop: 10 }} onPress={() => setQuitAsk(false)} />
      </Overlay>

      {/* results */}
      <Overlay visible={!!result} dismissable={false}>
        {result ? <ResultCard mode={props.mode} score={result.score} reward={result.reward} onExit={props.onExit} onReplay={props.onReplay} /> : null}
      </Overlay>
    </View>
  );
}

function ResultCard({ mode, score, reward, onExit, onReplay }: { mode: RoundMode; score: number; reward: RoundReward; onExit: () => void; onReplay: () => void }) {
  const bee = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(bee, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 6 }).start(); }, [bee]);
  const daily = mode !== "free";
  const STARS = mode === "weekend" ? WEEKEND_STARS : DAILY_STARS;
  const title = daily
    ? reward.stars === 3 ? t("game.perfect") : reward.stars > 0 ? t("game.solved") : t("game.almost")
    : reward.record ? t("game.record") : t("game.over");
  return (
    <View style={{ alignItems: "center" }} accessibilityLabel={t("game.results")}>
      <Animated.Image source={ART.honey} style={{ width: 72, height: 72, transform: [{ scale: bee }] }} />
      <Txt v="h1" center style={{ marginTop: 6 }}>{title}</Txt>
      {daily ? <View style={{ marginTop: 10 }}><Stars n={reward.stars} size={46} gap={8} animate /></View> : null}
      <Txt v="tiny" color={C.dim} style={{ marginTop: 14 }}>{t("game.points")}</Txt>
      <CountUp value={score} duration={900} style={[F.black, { fontSize: 40, lineHeight: 46, color: C.text }]} />
      {daily && reward.stars === 0 ? <Txt v="small" color={C.dim} center>{t("game.needForStar", { n: fmt(STARS[0]) })}</Txt> : null}
      <View style={styles.rewardRow}>
        <View style={styles.rewardItem}>
          <Image source={ART.honey} style={{ width: 34, height: 34 }} />
          <CountUp value={reward.honey} duration={1100} format={(n) => "+" + fmt(n)} style={[F.black, { fontSize: 22, color: C.honeyDark }]} />
        </View>
        {reward.jelly > 0 ? (
          <View style={styles.rewardItem}>
            <Image source={ART.jelly} style={{ width: 34, height: 34 }} />
            <Text style={[F.black, { fontSize: 22, color: C.jelly }]}>+{reward.jelly}</Text>
          </View>
        ) : null}
        {reward.points ? (
          <View style={styles.rewardItem} accessibilityLabel={t("ev.pointsLabel", { n: reward.points })}>
            <Image source={ART.point} style={{ width: 34, height: 34 }} />
            <Text style={[F.black, { fontSize: 22, color: "#C25E00" }]}>+{reward.points}</Text>
          </View>
        ) : null}
      </View>
      {reward.boxes.length ? (
        <View style={[styles.rewardRow, { marginTop: 10 }]} accessibilityLabel={t("game.combsLabel", { list: reward.boxes.map((b) => BOX_INFO[b].name).join(", ") })}>
          {reward.boxes.map((b, i) => (
            <View key={i} style={styles.rewardItem}><Image source={boxArt(b)} style={{ width: 38, height: 38 }} /><Txt v="small">{BOX_INFO[b].name}</Txt></View>
          ))}
        </View>
      ) : null}
      {reward.froze ? <Txt v="small" color="#3B7CC4" center style={{ marginTop: 6 }}>{t("game.froze")}</Txt> : null}
      {mode === "daily" && reward.stars > 0 && reward.streak > 0 ? (
        <View style={[styles.chip, { marginTop: 10 }]}>
          <Image source={ART.flame} style={{ width: 18, height: 18 }} />
          <Txt v="small" color={C.honeyDark}>{t("game.streak", { n: reward.streak })}</Txt>
        </View>
      ) : null}
      <View style={{ alignSelf: "stretch", marginTop: 18, gap: 10 }}>
        <GameButton title={daily ? t("game.done") : t("game.again")} color={daily ? "honey" : "green"} onPress={daily ? onExit : onReplay} />
        <GameButton title={daily ? t("game.replay") : t("game.menu")} color="white" onPress={daily ? onReplay : onExit} />
      </View>
    </View>
  );
}

const NIGHT_DIM = "#E4D8FF";
const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" }, // background: App (C.bg, or the event backdrop)
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, alignSelf: "stretch", gap: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  moves: { width: 62, height: 58, borderRadius: 20, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center", ...shadow },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", paddingHorizontal: 16, height: 32, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF", borderRadius: 14, paddingHorizontal: 10, height: 28 },
  dock: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  dockCard: { flexGrow: 1, flexBasis: "45%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 8, minHeight: 56 },
  dockHint: { backgroundColor: "#FFF3D6", borderColor: "#FFB51F" },
  dockIc: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  dockStats: { flexBasis: "100%", minHeight: 0, paddingVertical: 6, paddingHorizontal: 0, gap: 0 },
  stat: { flex: 1, alignItems: "center" },
  statMid: { borderLeftWidth: 2, borderRightWidth: 2, borderColor: C.line },
  boardWrap: { backgroundColor: C.board, borderRadius: 26, padding: 6, borderWidth: 3, borderColor: C.boardEdge },
  floatText: { textShadowColor: "#fff", textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 14 },
  rewardItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, ...shadow },
});
