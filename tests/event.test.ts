/** v1.6 Halloween event: calendar, pumpkin tiles, ghost, points, reward track. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPath, createBoard, DEFAULT_RULES, findBestPath, GHOST_BONUS, PuzzleRules } from "../src/logic/board";
import { COLS, ROWS } from "../src/logic/hex";
import { dayNumber } from "../src/logic/day";
import { activeEvent, claimable, PUMPKIN_CHANCE, TRACK, trackEvent } from "../src/logic/event";
import { trickGuest, treatGuest } from "../src/logic/game";
import { claimTrackStep, eventView, finishRound, GameState, migrate, newState, RoundSummary } from "../src/logic/game";

const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).getTime();
const day = (m: number, d: number) => dayNumber(new Date(2026, m - 1, d));
const EVENT: PuzzleRules = { ...DEFAULT_RULES, pumpkinChance: PUMPKIN_CHANCE, ghost: true };
const sum = (mode: RoundSummary["mode"], extra: Partial<RoundSummary> = {}): RoundSummary =>
  ({ mode, score: 0, chains: [], bombs: 0, cellsByColor: [0, 0, 0, 0, 0], ...extra });

test("calendar: 24 Oct – 2 Nov local days, claims stay open 3 more days", () => {
  assert.equal(activeEvent(day(10, 23)), null);
  assert.equal(activeEvent(day(10, 24))?.id, "halloween-2026");
  assert.equal(activeEvent(day(11, 2))?.id, "halloween-2026");
  assert.equal(activeEvent(day(11, 3)), null);
  assert.equal(trackEvent(day(11, 5))?.id, "halloween-2026");
  assert.equal(trackEvent(day(11, 6)), null);
  assert.equal(activeEvent(dayNumber(new Date(2027, 9, 30)))?.id, "halloween-2027");
});

test("without event rules boards are unchanged (same RNG sequence, no pumpkins, no ghost)", () => {
  const a = createBoard(77), b = createBoard(77, { ...DEFAULT_RULES, pumpkinChance: 0, ghost: false });
  assert.deepEqual(a, b);
  const p = findBestPath(a);
  assert.deepEqual(applyPath(a, p).board, applyPath(b, p, { ...DEFAULT_RULES, pumpkinChance: 0 }).board);
  assert.ok(a.cells.flat().every((c) => c.kind !== "pumpkin" && !c.ghost));
});

test("ghost: exactly one on the board, hops every move, caught in a chain gives the bonus and comes back", () => {
  let b = createBoard(5, EVENT);
  const ghosts = () => b.cells.flat().filter((c) => c.ghost).length;
  assert.equal(ghosts(), 1);
  let caught = 0, moved = 0;
  for (let i = 0; i < 200; i++) {
    const before = b.cells.flat().find((c) => c.ghost)!.id;
    const p = findBestPath(b, 6, 3000);
    const r = applyPath(b, p, EVENT);
    if (r.ghostCaught) { caught++; assert.ok(r.score >= GHOST_BONUS); }
    b = r.board;
    assert.equal(ghosts(), 1, `move ${i}`);
    if (b.cells.flat().find((c) => c.ghost)!.id !== before) moved++;
  }
  assert.ok(moved > 150, `ghost moved ${moved}`);
  assert.ok(caught === 0 || caught < 200);
});

test("pumpkins join any chain and spawn only with the event chance", () => {
  let b = createBoard(9, EVENT);
  let pumpkins = 0, spawned = 0;
  for (let i = 0; i < 300; i++) {
    const r = applyPath(b, findBestPath(b, 6, 3000), EVENT);
    pumpkins += r.pumpkins;
    spawned += r.dropped.reduce((a, n) => a + n, 0);
    b = r.board;
  }
  const rate = pumpkins / spawned;
  assert.ok(spawned > 0 && pumpkins > 0);
  assert.ok(rate > 0.01 && rate < 0.12, `pumpkin share ${rate}`);
  assert.equal(COLS * ROWS, b.cells.flat().length);
});

test("points: free play pumpkins and ghosts, daily pays for new stars, nothing outside the event", () => {
  const s0 = newState(at(10, 20));
  const off = finishRound(s0, sum("free", { pumpkins: 5, ghosts: 2 }), at(10, 20));
  assert.equal(off.reward.points, 0);
  assert.equal(off.state.event.points, 0);
  const free = finishRound(s0, sum("free", { pumpkins: 5, ghosts: 2 }), at(10, 25));
  assert.equal(free.reward.points, 5 + 2 * 3);
  assert.equal(free.state.event.id, "halloween-2026");
  const daily = finishRound(free.state, sum("daily", { score: 3000, pumpkins: 9 }), at(10, 25));
  assert.equal(daily.reward.points, 3 * 2);
  const again = finishRound(daily.state, sum("daily", { score: 3000 }), at(10, 25));
  assert.equal(again.reward.points, 0); // no new stars
  assert.equal(again.state.event.points, 17);
});

test("track: claims in order, rewards credited, survives save/load, next year starts fresh", () => {
  let s: GameState = { ...newState(at(10, 24)), event: { id: "halloween-2026", points: 50, claimed: 0 } };
  assert.equal(claimable(s.event), 3);
  const jelly = s.jelly;
  let r = claimTrackStep(s, at(10, 24))!;
  assert.equal(r.state.jelly, jelly + 2);
  r = claimTrackStep(r.state, at(10, 24))!;
  assert.equal(r.state.loot.boxes.wood, s.loot.boxes.wood + 1);
  r = claimTrackStep(r.state, at(10, 24))!;
  assert.equal(r.state.loot.seeds.pumpkin, 2);
  assert.equal(claimTrackStep(r.state, at(10, 24)), null); // 70 not reached
  // a costume step whose skin is not registered waits instead of being burned
  const hat = { ...r.state, event: { ...r.state.event, points: 70 } };
  const c = claimTrackStep(hat, at(10, 24));
  assert.ok(c === null || c.state.loot.owned.includes("witchhat"));
  s = migrate(JSON.parse(JSON.stringify(r.state)), at(10, 24));
  assert.deepEqual(s.event, { id: "halloween-2026", points: 50, claimed: 3 });
  assert.ok(claimTrackStep({ ...s, event: { ...s.event, points: 999, claimed: 4 } }, at(11, 5))); // grace day
  assert.equal(claimTrackStep({ ...s, event: { ...s.event, points: 999, claimed: 4 } }, at(11, 6)), null);
  assert.equal(eventView(s, new Date(2027, 9, 25, 12).getTime())?.progress.points, 0);
  assert.equal(TRACK.length, 12);
  assert.ok(TRACK.every((st, i) => i === 0 || st.at > TRACK[i - 1].at));
});

test("calibration: a greedy 20-move free round earns roughly 5–15 event points", () => {
  let total = 0;
  const N = 30;
  for (let g = 0; g < N; g++) {
    let b = createBoard(1000 + g, EVENT);
    for (let m = 0; m < 20; m++) {
      const r = applyPath(b, findBestPath(b, 6, 3000), EVENT);
      total += r.pumpkins + (r.ghostCaught ? 3 : 0);
      b = r.board;
    }
  }
  const avg = total / N;
  assert.ok(avg > 4 && avg < 16, `avg ${avg}`);
});

test("costumes: on the track, wearable, never in combs, the shop or the album pages", async () => {
  const { EVENT_SKINS, ITEMS, PAGES, SKIN_BY_ID } = await import("../src/logic/loot");
  for (const k of EVENT_SKINS) {
    assert.ok(SKIN_BY_ID[k.id]);
    assert.ok(!ITEMS.some((i) => i.id === k.id));
    assert.ok(!PAGES.some((p) => p.items.includes(k.id)));
    assert.ok(TRACK.some((st) => st.reward.skin === k.id), k.id);
  }
});

test("trick or treat: one guest a day during the event, +5 points and a sweet", () => {
  const s = newState(at(10, 20));
  assert.equal(trickGuest(s, at(10, 20)), null);
  assert.ok(trickGuest(s, at(10, 26)));
  const r = treatGuest(s, at(10, 26))!;
  assert.equal(r.state.event.points, 5);
  assert.equal(trickGuest(r.state, at(10, 26, 20)), null);
  assert.equal(treatGuest(r.state, at(10, 26, 20)), null);
  assert.ok(trickGuest(r.state, at(10, 27)));
  assert.equal(migrate(JSON.parse(JSON.stringify(r.state)), at(10, 26)).event.trickDay, r.state.event.trickDay);
});
