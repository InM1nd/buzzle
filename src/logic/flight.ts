/**
 * Pre-computed bee flight paths (pure, deterministic). A path is a closed Catmull-Rom loop through jittered
 * waypoints around the hive, optionally landing on a comb for a "working" wiggle. It is sampled once into
 * keyframes that drive native Animated interpolations (translate, bank angle, facing, rest), so the
 * flight itself needs no JS per frame.
 */
import { Rng } from "./rng";

export interface P { x: number; y: number }
export interface FlightOpts {
  w: number; h: number;      // area for the bee's centre
  seed: number;
  land?: P | null;           // where to rest (bee centre)
  speed?: number;            // px/s
  margin?: number;           // keep the centre this far from the area edge
}
export interface FlightPath {
  duration: number;          // ms for one loop
  t: number[];               // normalised times 0..1 (strictly increasing)
  x: number[]; y: number[];
  rot: number[];             // bank angle, deg
  flip: number[];            // facing: -1 (left) … 1 (right), passes through 0 when turning
  rest: number[];            // 0 flying … 1 resting
  yaw: number[];             // view: 0 = facing the camera … ±1 = near profile to the right/left (v1.2 multi-view bees)
  landAt: number | null;     // normalised time of touch-down
}

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

function catmull(p0: P, p1: P, p2: P, p3: P, u: number): P {
  const u2 = u * u, u3 = u2 * u;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

interface S { time: number; x: number; y: number; rot: number; dir: number; rest: number; fly: boolean; yaw?: number }

export function buildFlight(o: FlightOpts): FlightPath {
  const rng = new Rng((o.seed >>> 0) || 1);
  const m = o.margin ?? 20;
  const cx = o.w / 2, cy = o.h / 2;
  const rx = Math.max(8, o.w / 2 - m), ry = Math.max(8, o.h / 2 - m);
  const K = 5 + rng.int(3);
  const dirSign = rng.next() < 0.5 ? 1 : -1;
  const a0 = rng.next() * TAU;
  const pts: P[] = [];
  for (let k = 0; k < K; k++) {
    const a = a0 + dirSign * (k / K) * TAU + (rng.next() - 0.5) * (TAU / K) * 0.6;
    const r = 0.5 + 0.5 * rng.next();
    pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
  }
  let landIdx = -1;
  if (o.land) { landIdx = 1 + rng.int(K - 1); pts[landIdx] = { x: o.land.x, y: o.land.y }; }

  // dense, closed curve
  const SEG = 26;
  const dense: P[] = [];
  let landDense = -1;
  for (let i = 0; i < K; i++) {
    const p0 = pts[(i - 1 + K) % K], p1 = pts[i], p2 = pts[(i + 1) % K], p3 = pts[(i + 2) % K];
    for (let j = 0; j < SEG; j++) {
      if (i === landIdx && j === 0) landDense = dense.length;
      const q = catmull(p0, p1, p2, p3, j / SEG);
      dense.push({ x: clamp(q.x, m * 0.5, o.w - m * 0.5), y: clamp(q.y, m * 0.5, o.h - m * 0.5) });
    }
  }
  const N = dense.length;
  // lissajous-like meander on top of the loop (damped near the landing spot so touch-down is clean)
  {
    const amp = 6 + 8 * rng.next(), f1 = 5 + rng.int(4), f2 = 2 + rng.int(3), ph = rng.next() * TAU;
    const L = landDense >= 0 ? dense[landDense] : null;
    const base = dense.map((p) => ({ ...p }));
    for (let i = 0; i < N; i++) {
      const a = base[(i - 1 + N) % N], b = base[(i + 1) % N];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const u = (TAU * i) / N;
      const damp = L ? smooth(10, 90, Math.hypot(base[i].x - L.x, base[i].y - L.y)) : 1;
      const off = amp * damp * (Math.sin(f1 * u + ph) * 0.7 + Math.sin(f2 * u + ph * 1.7) * 0.5);
      dense[i] = { x: clamp(base[i].x + nx * off, m * 0.5, o.w - m * 0.5), y: clamp(base[i].y + ny * off, m * 0.5, o.h - m * 0.5) };
    }
  }
  const speed = (o.speed ?? 95) * (0.8 + 0.45 * rng.next());
  const wob = rng.next() * TAU;
  const land = landDense >= 0 ? dense[landDense] : null;

  // timing along the curve: slow down near the landing spot, gentle speed wobble elsewhere
  const times: number[] = [0];
  for (let i = 0; i < N; i++) {
    const a = dense[i], b = dense[(i + 1) % N];
    const ds = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const f = land ? 0.22 + 0.78 * smooth(0, 80, Math.hypot(mid.x - land.x, mid.y - land.y)) : 1;
    const w = 1 + 0.22 * Math.sin(wob + (TAU * 3 * i) / N);
    times.push(times[i] + Math.max(0.004, ds / (speed * f * w)));
  }

  // velocity → bank angle and facing (hysteresis, two passes so the loop start is consistent)
  const vel = dense.map((_, i) => {
    const a = dense[(i - 1 + N) % N], b = dense[(i + 1) % N];
    const dt = (i === 0 ? times[N] - times[N - 1] + times[1] : times[i + 1] - times[i - 1]) || 1e-3;
    return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
  });
  const dirs: number[] = new Array(N).fill(1);
  let dir = 1;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N; i++) {
      if (vel[i].vx > speed * 0.25) dir = 1; else if (vel[i].vx < -speed * 0.25) dir = -1;
      dirs[i] = dir;
    }
  }
  const samples: S[] = dense.map((d, i) => ({
    time: times[i], x: d.x, y: d.y, dir: dirs[i], rest: 0, fly: true,
    rot: clamp((vel[i].vx / speed) * 16, -18, 18) + clamp((vel[i].vy / speed) * 4, -5, 5) * dirs[i],
  }));
  // facing: cyclic moving average so a reversal reads as a short turn (scaleX passes through 0)
  const W = 4;
  const flip = samples.map((_, i) => {
    let s = 0;
    for (let d = -W; d <= W; d++) s += samples[(i + d + N) % N].dir;
    return s / (2 * W + 1);
  });
  samples.forEach((s, i) => { s.dir = flip[i]; });
  // yaw: turn toward the flight direction; fast horizontal flight shows the near-profile, slow or
  // vertical flight a three-quarter view, a reversal passes through the front view
  const yawRaw = samples.map((s, i) => s.dir * (0.3 + 0.7 * clamp(Math.abs(vel[i].vx) / speed, 0, 1)));
  samples.forEach((s, i) => {
    let a = 0;
    for (let d = -W; d <= W; d++) a += yawRaw[(i + d + N) % N];
    s.yaw = a / (2 * W + 1);
  });

  // insert the landing: touch-down, wiggle bursts, take-off
  let out: S[] = samples;
  let landAt: number | null = null;
  let hold = 0;
  if (landDense >= 0) {
    const L = samples[landDense];
    hold = 1.8 + 1.6 * rng.next();
    const extra: S[] = [];
    const base = { x: L.x, y: L.y, dir: L.dir, fly: false, yaw: 0.12 * Math.sign(L.dir || 1) };
    extra.push({ ...base, time: L.time + 0.22, rot: 0, rest: 1 });
    let t = L.time + 0.4;
    const end = L.time + hold - 0.25;
    let k = 0;
    while (t < end - 0.15) {
      const burst = 3 + (k % 2);
      for (let b = 0; b < burst && t < end - 0.12; b++) {
        const s = b % 2 ? 1 : -1;
        extra.push({ ...base, time: t, rot: 7 * s, rest: 1, x: L.x + 1.3 * s, y: L.y - (b % 2) * 1.2 });
        t += 0.11;
      }
      extra.push({ ...base, time: t, rot: 0, rest: 1 });
      t += 0.32 + 0.2 * ((k * 7) % 3) / 2;
      k++;
    }
    extra.push({ ...base, time: end, rot: 0, rest: 1 });
    extra.push({ ...base, time: L.time + hold, rot: L.rot, rest: 0 });
    out = [...samples.slice(0, landDense + 1), ...extra, ...samples.slice(landDense + 1).map((s) => ({ ...s, time: s.time + hold }))];
    landAt = L.time;
  }
  const T = times[N] + hold;
  // close the loop
  out = [...out, { ...out[0], time: T }];
  // strictly increasing times
  for (let i = 1; i < out.length; i++) if (out[i].time <= out[i - 1].time) out[i] = { ...out[i], time: out[i - 1].time + 1e-4 };
  const Tn = out[out.length - 1].time;
  return {
    duration: Math.round(Tn * 1000),
    t: out.map((s) => s.time / Tn),
    x: out.map((s) => +s.x.toFixed(2)),
    y: out.map((s) => +s.y.toFixed(2)),
    rot: out.map((s) => +s.rot.toFixed(2)),
    flip: out.map((s) => +s.dir.toFixed(3)),
    rest: out.map((s) => s.rest),
    yaw: out.map((s) => +(s.yaw ?? 0).toFixed(3)),
    landAt: landAt === null ? null : landAt / Tn,
  };
}

/** Swarm/zip helper: quadratic bezier from a to b bulging by `bend` (px, signed), sampled. */
export function arcPath(a: P, b: P, bend: number, n = 20) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const c = { x: mx + nx * bend, y: my + ny * bend };
  const out: { t: number; x: number; y: number; rot: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
    const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
    const dx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x), dy = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
    out.push({ t, x, y, rot: clamp((dx / (Math.hypot(dx, dy) || 1)) * 18, -18, 18) + clamp(dy / (Math.hypot(dx, dy) || 1) * 6, -6, 6) });
  }
  return out;
}
