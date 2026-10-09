import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useInsets } from "../platform/insets";
import { addBackListener } from "../platform/back";
import {
  applyPath, Board, Cell, createBoard, shuffleBoard, findBestPath, isValidPath, MoveResult, pathColor, PuzzleRules, stepPath,
} from "../logic/board";
import { boardSize, cellCenter, COLS, hitTest, Pos, ROWS } from "../logic/hex";
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
}

// ---------- cell ----------
const CellView = React.memo(function CellView(p: {
  cell: Cell; x: number; y: number; startY: number; delay: number; s: number; selected: boolean; dim: boolean; hint: boolean; pulse: number;
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
    Animated.spring(sc, { toValue: p.selected ? 1.08 : 1, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
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
  const w = 2 * p.s * 0.97, h = SQ3 * p.s * 0.97;
  const src = p.cell.kind === "wild" ? ART.wild : ART.cells[p.cell.color];
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: p.x - w / 2, top: -h / 2, width: w, height: h, opacity: p.dim ? 0.5 : 1,
        transform: [{ translateY: ty }, { scale: Animated.add(sc, hint.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] })) }],
      }}
    >
      <Image source={src} style={{ width: w, height: h }} />
      {p.cell.kind === "bomb" ? <Image source={ART.bomb} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} /> : null}
      {p.selected ? <Image source={ART.ring} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} /> : null}
    </Animated.View>
  );
});

// ---------- effects ----------
interface PopFx { key: number; x: number; y: number; color: number; kind: Cell["kind"]; delay: number; s: number }
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
  const w = 2 * fx.s * 0.97, h = SQ3 * fx.s * 0.97;
  const col = C.pollen[fx.color];
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: fx.x, top: fx.y }}>
      <Animated.Image
        source={fx.kind === "wild" ? ART.wild : ART.cells[fx.color]}
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
  const { width, height } = useWindowDimensions();
  const insets = useInsets();
  const avail = Math.min(width - 20, 560);
  const sByW = avail / (1.5 * COLS + 0.5);
  const sByH = (height - insets.top - insets.bottom - 190) / (SQ3 * (ROWS + 0.5));
  const s = Math.max(20, Math.min(sByW, sByH));
  const size = boardSize(s);
  const H = SQ3 * s;

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

  const summary = useRef<RoundSummary>({ mode: props.mode, score: 0, chains: [], bombs: 0, cellsByColor: [0, 0, 0, 0, 0] });
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
        const { x, y } = cellCenter(c, r, s);
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
  }, [board, s, size.height, H]);
  useEffect(() => {
    const m = new Map<number, number>();
    layout.forEach((l) => m.set(l.cell.id, l.y));
    prevPos.current = m;
    first.current = false;
  }, [layout]);

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
      const { x, y } = cellCenter(rm.pos.c, rm.pos.r, s);
      const idx = p.findIndex((q) => q.c === rm.pos.c && q.r === rm.pos.r);
      return { key: fxId.current++, x, y, color: rm.cell.color, kind: rm.cell.kind, s, delay: rm.blast ? 120 + (i % 6) * 15 : Math.max(0, idx) * 22 };
    });
    setPops((old) => [...old, ...newPops]);
    const last = p[p.length - 1];
    const lc = cellCenter(last.c, last.r, s);
    const col = res.color ?? 0;
    addText(lc.x, lc.y - H * 0.4, `+${res.score}`, PATH_COLORS[col]);
    const len = p.length;
    if (res.bombsExploded) {
      addText(size.width / 2, size.height * 0.42, res.bombsExploded > 1 ? `Бум ×${res.bombsExploded}!` : "Бум!", "#B44DD8", true);
      hHeavy();
      Animated.sequence([6, -6, 4, -3, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
    } else if (len >= 10) { addText(size.width / 2, size.height * 0.42, "Медовый взрыв!", C.honeyDeep, true); hSuccess(); }
    else if (len >= 8) { addText(size.width / 2, size.height * 0.42, "Потрясающе!", C.honeyDeep, true); hSuccess(); }
    else if (len >= 6) { addText(size.width / 2, size.height * 0.42, "Отлично!", C.honeyDeep, true); hSuccess(); }
    else hLight();
    if (len >= 6 || res.bombsExploded) {
      const ids = props.beeIds?.length ? props.beeIds : ["zhuzha"];
      const z = { key: zipId.current++, id: ids[Math.floor(Math.random() * ids.length)], dir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1, y0: size.height * (0.25 + Math.random() * 0.45), big: len >= 10 || res.bombsExploded > 1 };
      setTimeout(() => setZips((q) => [...q.slice(-1), z]), 180);
    }
    if (res.newBomb) setTimeout(() => hTick(), 300);
    if (res.shuffled) {
      setTimeout(() => { addText(size.width / 2, size.height * 0.55, "Перемешиваем!", C.brown, true); setPulse((x) => x + 1); }, 450);
    }

    // stats
    const sm = summary.current;
    sm.score += res.score;
    sm.chains.push(len);
    sm.bombs += res.bombsExploded;
    res.removed.forEach((rm) => { if (rm.cell.kind === "n") sm.cellsByColor[rm.cell.color]++; });

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
  }, [combo, props.rules, props.beeIds, s, H, size.width, size.height, addText, shake, movesPulse]);

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
    const pos = hitTest(px - offset.current.x, py - offset.current.y, s);
    if (!pos) return;
    const cur = pathRef.current;
    const next = stepPath(boardRef.current, cur, pos);
    if (next !== cur) {
      pathRef.current = next;
      setPath(next);
      hTick();
    }
  }, [s]);
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
  const pathPts = path.map((p) => cellCenter(p.c, p.r, s));
  const lineColor = PATH_COLORS[pc ?? 0];
  const chainLen = path.length;
  const preview = chainLen >= 3 ? `${chainLen}${chainLen >= props.rules.bombAt ? " · бомба!" : ""}` : chainLen ? `${chainLen}` : "";

  const isDaily = props.mode !== "free";
  const STARS = props.mode === "weekend" ? WEEKEND_STARS : DAILY_STARS;
  const shuffle = () => {
    if (busy.current || finished || !props.onShuffle || !props.onShuffle()) { hError(); return; }
    hLight(); setPath([]); setHint([]);
    setBoard((b) => shuffleBoard(b));
  };
  const maxBar = isDaily ? STARS[2] * 1.12 : Math.max(props.best, 1000);
  const tooFew = path.length > 0 && path.length < 3;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8 }]}>
      {/* top bar */}
      <View style={styles.top}>
        <Press onPress={() => (finished ? props.onExit() : setQuitAsk(true))} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Выйти из раунда">
          <Image source={ART.close} style={{ width: 18, height: 18, tintColor: C.brown }} />
        </Press>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt v="tiny" color={C.dim}>{props.title.toUpperCase()}</Txt>
          <CountUp value={score} duration={450} style={[F.black, { fontSize: 32, lineHeight: 38, color: C.text }]} />
        </View>
        <Animated.View style={[styles.moves, movesLeft <= 5 && { backgroundColor: C.red }, { transform: [{ scale: movesPulse }] }]} accessibilityLabel={`Осталось ходов: ${movesLeft}`}>
          <Text style={[F.black, { fontSize: 24, lineHeight: 28, color: "#fff" }]}>{Math.max(0, movesLeft)}</Text>
          <Text style={[F.xbold, { fontSize: 10, lineHeight: 12, color: "#fff", opacity: 0.9 }]}>ХОДОВ</Text>
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
          <View style={{ position: "absolute", right: 6, top: -1 }}><Txt v="tiny" color={C.honeyDark}>рекорд {fmt(props.best)}</Txt></View>
        ) : null}
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.chip, { opacity: combo > 0 ? 1 : 0 }]}>
          <Image source={ART.flame} style={{ width: 18, height: 18 }} />
          <Txt v="small" color={C.honeyDark}>Комбо ×{1 + 0.25 * combo}</Txt>
        </View>
        <View style={[styles.chip, { opacity: preview ? 1 : 0, backgroundColor: tooFew ? "#FFF" : lineColor }]}>
          <Txt v="small" color={tooFew ? C.dim : "#fff"}>{tooFew ? "ещё " + (3 - path.length) : "цепочка " + preview}</Txt>
        </View>
      </View>

      {/* board */}
      <Animated.View style={[styles.boardWrap, { width: size.width + 12, height: size.height + 12, transform: [{ translateX: shake }] }]}>
        <View
          {...responder.panHandlers}
          accessibilityLabel="Игровое поле"
          style={{ width: size.width, height: size.height, overflow: "hidden" }}
        >
          {layout.map((l) => (
            <CellView
              key={l.cell.id}
              cell={l.cell}
              x={l.x}
              y={l.y}
              startY={l.startY}
              delay={l.delay}
              s={s}
              selected={selected.has(l.c * 100 + l.r)}
              dim={pc !== null && l.cell.kind !== "wild" && l.cell.color !== pc && !selected.has(l.c * 100 + l.r)}
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
        <GameButton small title={`Перемешать (${props.shuffles})`} icon={ART.boostShuffle} color="white" onPress={shuffle} style={{ marginTop: 8, alignSelf: "center" }} label={`Перемешать поле, осталось ${props.shuffles}`} />
      ) : null}
      <Txt v="small" color={C.dim} center style={{ marginTop: 8 }}>
        {isDaily ? "Ведите пальцем по 3+ сотам одного цвета" : "Цепочка из " + props.rules.bombAt + "+ сот оставляет бомбу"}
      </Txt>

      {/* quit confirm */}
      <Overlay visible={quitAsk && !result} onClose={() => setQuitAsk(false)}>
        <Txt v="h2" center>Закончить раунд?</Txt>
        <Txt v="body" color={C.dim} center style={{ marginTop: 6, marginBottom: 18 }}>
          Набранные очки засчитаются и превратятся в мёд.
        </Txt>
        <GameButton title="Закончить" color="honey" onPress={() => { setQuitAsk(false); endRound(); }} />
        <GameButton title="Играть дальше" color="white" style={{ marginTop: 10 }} onPress={() => setQuitAsk(false)} />
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
    ? reward.stars === 3 ? "Идеально!" : reward.stars > 0 ? "Головоломка пройдена!" : "Почти получилось!"
    : reward.record ? "Новый рекорд!" : "Раунд окончен";
  return (
    <View style={{ alignItems: "center" }} accessibilityLabel="Итоги раунда">
      <Animated.Image source={ART.honey} style={{ width: 84, height: 84, marginTop: -64, transform: [{ scale: bee }] }} />
      <Txt v="h1" center style={{ marginTop: 6 }}>{title}</Txt>
      {daily ? <View style={{ marginTop: 10 }}><Stars n={reward.stars} size={46} gap={8} animate /></View> : null}
      <Txt v="tiny" color={C.dim} style={{ marginTop: 14 }}>ОЧКИ</Txt>
      <CountUp value={score} duration={900} style={[F.black, { fontSize: 40, lineHeight: 46, color: C.text }]} />
      {daily && reward.stars === 0 ? <Txt v="small" color={C.dim} center>Для звезды нужно {fmt(STARS[0])} очков — попробуйте ещё раз!</Txt> : null}
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
      </View>
      {reward.boxes.length ? (
        <View style={[styles.rewardRow, { marginTop: 10 }]} accessibilityLabel={`Соты-сюрпризы: ${reward.boxes.map((b) => BOX_INFO[b].name).join(", ")}`}>
          {reward.boxes.map((b, i) => (
            <View key={i} style={styles.rewardItem}><Image source={boxArt(b)} style={{ width: 38, height: 38 }} /><Txt v="small">{BOX_INFO[b].name}</Txt></View>
          ))}
        </View>
      ) : null}
      {reward.froze ? <Txt v="small" color="#3B7CC4" center style={{ marginTop: 6 }}>Заморозка спасла серию!</Txt> : null}
      {mode === "daily" && reward.stars > 0 && reward.streak > 0 ? (
        <View style={[styles.chip, { marginTop: 10 }]}>
          <Image source={ART.flame} style={{ width: 18, height: 18 }} />
          <Txt v="small" color={C.honeyDark}>Серия: {reward.streak} дн.</Txt>
        </View>
      ) : null}
      <View style={{ alignSelf: "stretch", marginTop: 18, gap: 10 }}>
        <GameButton title={daily ? "Готово" : "Ещё раунд"} color={daily ? "honey" : "green"} onPress={daily ? onExit : onReplay} />
        <GameButton title={daily ? "Переиграть" : "В меню"} color="white" onPress={daily ? onReplay : onExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: "center" },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, alignSelf: "stretch", gap: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  moves: { width: 62, height: 58, borderRadius: 20, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center", ...shadow },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", paddingHorizontal: 16, height: 32, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF", borderRadius: 14, paddingHorizontal: 10, height: 28 },
  boardWrap: { backgroundColor: C.board, borderRadius: 26, padding: 6, borderWidth: 3, borderColor: C.boardEdge },
  floatText: { textShadowColor: "#fff", textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
  rewardRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  rewardItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, ...shadow },
});
