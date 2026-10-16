/**
 * v1.6 mini-game «Ночной полёт» (Meadow): a side-scrolling flight between flower stems. Pure and deterministic:
 * a seeded world advanced by fixed substeps, so the same seed and the same taps give the same run (tests).
 * World units: height 1000, width from the screen aspect; the camera follows the bee (absolute x = dist + BEE_X).
 */
import { Rng } from "./rng";

export const FH = 1000;
export const GROUND = 885;
export const BEE_R = 28;          // hitbox, ~70% of the drawn bee
export const STEM_W = 222;        // drawn width (art 200×900 at height 1000)
export const STEM_HIT = 44;       // half-width of the stem hitbox (trunk + leaves)
export const BAT_R = 30;
export const PICK_R = 46;         // generous pickup radius
const GRAVITY = 2300, FLAP = -680, MAX_FALL = 900;
const SPACING = 540, SPEED0 = 290, SPEED_MAX = 430;
const GAP0 = 340, GAP_MIN = 255;
const STEP = 1 / 120;

export interface Stem { x: number; gapY: number; gap: number; passed: boolean }
/** kind 0..2 candies (1), 3 firefly (3) */
export interface Pick { x: number; y: number; kind: number; taken: boolean }
export interface Bat { x: number; y0: number; amp: number; ph: number }
export interface World {
  W: number; beeX: number; t: number; y: number; vy: number; dist: number;
  stems: Stem[]; picks: Pick[]; bats: Bat[];
  passed: number; candies: number; over: boolean; rng: number; nextX: number;
}

export const speedAt = (passed: number) => Math.min(SPEED_MAX, SPEED0 + passed * 6);
export const gapAt = (passed: number) => Math.max(GAP_MIN, GAP0 - passed * 4);
export const pickValue = (kind: number) => (kind === 3 ? 3 : 1);

export function newWorld(seed: number, W: number): World {
  const w: World = {
    W, beeX: Math.round(W * 0.3), t: 0, y: FH * 0.45, vy: 0, dist: 0,
    stems: [], picks: [], bats: [], passed: 0, candies: 0, over: false, rng: (seed >>> 0) || 1, nextX: W + 120,
  };
  spawn(w);
  return w;
}

function spawn(w: World) {
  const rng = new Rng(w.rng);
  while (w.nextX < w.dist + w.W + STEM_W * 2) {
    const n = w.stems.length;
    const gap = gapAt(n);
    const lo = 150 + gap / 2, hi = GROUND - 120 - gap / 2;
    const prev = w.stems[n - 1]?.gapY ?? FH * 0.45;
    // consecutive gaps stay reachable: at most ±260 from the previous one
    const gapY = Math.max(lo, Math.min(hi, prev + (rng.next() * 2 - 1) * 260));
    w.stems.push({ x: w.nextX, gapY, gap, passed: false });
    if (rng.next() < 0.7) w.picks.push({ x: w.nextX, y: gapY + (rng.next() - 0.5) * gap * 0.3, kind: rng.int(3), taken: false });
    const mid = w.nextX + SPACING / 2;
    // bats from the 8th stem: they sway around the gap height, so there is always room above or below
    if (n >= 8 && rng.next() < 0.3) w.bats.push({ x: mid, y0: gapY, amp: 60 + rng.next() * 40, ph: rng.next() * Math.PI * 2 });
    else if (rng.next() < 0.45) w.picks.push({ x: mid, y: 200 + rng.next() * (GROUND - 360), kind: rng.next() < 0.15 ? 3 : rng.int(3), taken: false });
    w.nextX += SPACING;
  }
  w.rng = rng.state;
  // forget what is far behind the camera
  const cut = w.dist - STEM_W;
  if (w.stems.length > 8) w.stems = w.stems.filter((s) => s.x > cut || !s.passed);
  w.picks = w.picks.filter((p) => p.x > cut);
  w.bats = w.bats.filter((b) => b.x > cut);
}

export const batY = (b: Bat, t: number) => b.y0 + Math.sin(t * 3.6 + b.ph) * b.amp;

function hitsRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = Math.max(x0 - cx, 0, cx - x1), dy = Math.max(y0 - cy, 0, cy - y1);
  return dx * dx + dy * dy < r * r;
}

/** advance by dt seconds (clamped: a resumed app never teleports the bee through a stem); flap = tap this frame */
export function step(w0: World, dt: number, flap: boolean): World {
  if (w0.over) return w0;
  const w: World = { ...w0, stems: w0.stems.map((s) => ({ ...s })), picks: w0.picks.map((p) => ({ ...p })), bats: w0.bats };
  if (flap) w.vy = FLAP;
  let left = Math.min(0.05, Math.max(0, dt));
  while (left > 1e-9 && !w.over) {
    const h = Math.min(STEP, left);
    left -= h;
    w.t += h;
    w.vy = Math.min(MAX_FALL, w.vy + GRAVITY * h);
    w.y += w.vy * h;
    if (w.y < BEE_R) { w.y = BEE_R; w.vy = Math.max(0, w.vy); }
    w.dist += speedAt(w.passed) * h;
    const bx = w.dist + w.beeX;
    if (w.y > GROUND - BEE_R) { w.y = GROUND - BEE_R; w.over = true; break; }
    for (const s of w.stems) {
      if (Math.abs(s.x - bx) > STEM_HIT + BEE_R) { if (!s.passed && s.x < bx) { s.passed = true; w.passed++; } continue; }
      const top = s.gapY - s.gap / 2, bot = s.gapY + s.gap / 2;
      if (hitsRect(bx, w.y, BEE_R, s.x - STEM_HIT, -FH, s.x + STEM_HIT, top) || hitsRect(bx, w.y, BEE_R, s.x - STEM_HIT, bot, s.x + STEM_HIT, FH * 2)) { w.over = true; break; }
    }
    if (w.over) break;
    for (const b of w.bats) {
      const dx = b.x - bx, dy = batY(b, w.t) - w.y;
      if (dx * dx + dy * dy < (BAT_R + BEE_R) ** 2) { w.over = true; break; }
    }
    for (const p of w.picks) {
      if (p.taken) continue;
      const dx = p.x - bx, dy = p.y - w.y;
      if (dx * dx + dy * dy < (PICK_R + BEE_R) ** 2) { p.taken = true; w.candies += pickValue(p.kind); }
    }
  }
  spawn(w);
  return w;
}

// ---------------------------------------------------------------- rewards
/** runs per game day that pay nectar (later runs are for the record) */
export const FLIGHT_PAID_RUNS = 3;
export const flightNectar = (passed: number, candies: number) => Math.min(15, Math.floor(passed / 2) + candies);
/** event points: half the candies, at most 8 a run (a minute of flight should not out-earn a free puzzle round) */
export const flightPoints = (candies: number) => Math.min(8, Math.floor(candies / 2));
