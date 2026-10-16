/** v1.6 Halloween event: calendar, pumpkin tiles, ghost, points, reward track. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPath, createBoard, DEFAULT_RULES, findBestPath, GHOST_BONUS, PuzzleRules } from "../src/logic/board";
import { COLS, ROWS } from "../src/logic/hex";
import { dayNumber } from "../src/logic/day";
import { activeEvent, claimable, PUMPKIN_CHANCE, TRACK, trackEvent } from "../src/logic/event";
import { harvestAction, plantFlower, shownDecos, toggleDeco, trickGuest, treatGuest, waterBedAction } from "../src/logic/game";
import { claimTrackStep, eventView, finishRound, GameState, migrate, newState, RoundSummary } from "../src/logic/game";

const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).getTime();
const day = (m: number, d: number) => dayNumber(new Date(2026, m - 1, d));
const EVENT: PuzzleRules = { ...DEFAULT_RULES, pumpkinChance: PUMPKIN_CHANCE, ghost: true };
const sum = (mode: RoundSummary["mode"], extra: Partial<RoundSummary> = {}): RoundSummary =>
  ({ mode, score: 0, chains: [], bombs: 0, cellsByColor: [0, 0, 0, 0, 0], ...extra });

test("calendar: 19 Oct – 8 Nov local days, claims stay open 3 more days", () => {
  assert.equal(activeEvent(day(10, 18)), null);
  assert.equal(activeEvent(day(10, 19))?.id, "halloween-2026");
  assert.equal(activeEvent(day(11, 8))?.id, "halloween-2026");
  assert.equal(activeEvent(day(11, 9)), null);
  assert.equal(trackEvent(day(11, 11))?.id, "halloween-2026");
  assert.equal(trackEvent(day(11, 12)), null);
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
  const s0 = newState(at(10, 15));
  const off = finishRound(s0, sum("free", { pumpkins: 5, ghosts: 2 }), at(10, 15));
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
  let s: GameState = { ...newState(at(10, 24)), event: { id: "halloween-2026", points: 75, claimed: 0 } };
  assert.equal(claimable(s.event), 3);
  const jelly = s.jelly;
  let r = claimTrackStep(s, at(10, 24))!;
  assert.equal(r.state.jelly, jelly + 2);
  r = claimTrackStep(r.state, at(10, 24))!;
  assert.equal(r.state.loot.boxes.wood, s.loot.boxes.wood + 1);
  r = claimTrackStep(r.state, at(10, 24))!;
  assert.equal(r.state.loot.seeds.pumpkin, 2);
  assert.equal(claimTrackStep(r.state, at(10, 24)), null); // 105 not reached
  // a costume step whose skin is not registered waits instead of being burned
  const hat = { ...r.state, event: { ...r.state.event, points: 105 } };
  const c = claimTrackStep(hat, at(10, 24));
  assert.ok(c === null || c.state.loot.owned.includes("witchhat"));
  s = migrate(JSON.parse(JSON.stringify(r.state)), at(10, 24));
  assert.deepEqual(s.event, { id: "halloween-2026", points: 75, claimed: 3 });
  assert.ok(claimTrackStep({ ...s, event: { ...s.event, points: 999, claimed: 4 } }, at(11, 11))); // grace day
  assert.equal(claimTrackStep({ ...s, event: { ...s.event, points: 999, claimed: 4 } }, at(11, 12)), null);
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

test("lanterns: each harvested pumpkin carves the next of four, they stay in the hive after save/load", async () => {
  const { EVENT_DECOS, ITEMS, PAGES } = await import("../src/logic/loot");
  for (const d of EVENT_DECOS) {
    assert.ok(!ITEMS.some((i) => i.id === d.id));
    assert.ok(!PAGES.some((p) => p.items.includes(d.id)));
  }
  const T = at(10, 20, 8), H = 3600_000;
  let s: GameState = newState(T);
  s = { ...s, loot: { ...s.loot, seeds: { pumpkin: 5 } } };
  const got: (string | undefined)[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = T + i * 7 * H;
    s = waterBedAction(plantFlower(s, 0, "pumpkin", t0)!, 0, t0 + 3 * H)!;
    const r = harvestAction(s, 0, t0 + 6 * H + 1)!;
    got.push(r.jack);
    s = r.state;
  }
  assert.deepEqual(got, ["jack1", "jack2", "jack3", "jack4", undefined]);
  s = toggleDeco(s, "jack2")!;
  const back = migrate(JSON.parse(JSON.stringify(s)), T + 40 * H);
  assert.deepEqual(shownDecos(back, "hive"), ["jack1", "jack3", "jack4"]);
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
  const s = newState(at(10, 15));
  assert.equal(trickGuest(s, at(10, 15)), null);
  assert.ok(trickGuest(s, at(10, 26)));
  const r = treatGuest(s, at(10, 26))!;
  assert.equal(r.state.event.points, 5);
  assert.equal(trickGuest(r.state, at(10, 26, 20)), null);
  assert.equal(treatGuest(r.state, at(10, 26, 20)), null);
  assert.ok(trickGuest(r.state, at(10, 27)));
  assert.equal(migrate(JSON.parse(JSON.stringify(r.state)), at(10, 26)).event.trickDay, r.state.event.trickDay);
});

test("start popup once per event; autumn backdrop 1 Sep – 30 Nov; start and ending reminders", async () => {
  const { eventIntroDue, eventIntroSeen } = await import("../src/logic/game");
  const { isAutumn } = await import("../src/logic/event");
  const { planNotifications } = await import("../src/logic/notifyPlan");
  let s = newState(at(10, 16));
  assert.equal(eventIntroDue(s, at(10, 16)), false);
  assert.equal(eventIntroDue(s, at(10, 19)), true);
  s = eventIntroSeen(s, at(10, 19));
  assert.equal(eventIntroDue(migrate(JSON.parse(JSON.stringify(s)), at(10, 20)), at(10, 20)), false);
  assert.ok(!isAutumn(day(8, 31)) && isAutumn(day(9, 1)) && isAutumn(day(11, 30)) && !isAutumn(day(12, 1)));
  const n = { ...newState(at(10, 16)), settings: { ...newState(at(10, 16)).settings, notifications: true } };
  const plan = planNotifications(n, at(10, 16));
  assert.equal(plan.find((x) => x.id === "event-start")?.at, new Date(2026, 9, 19, 10).getTime());
  assert.equal(plan.find((x) => x.id === "event-end")?.at, new Date(2026, 10, 6, 18).getTime());
  assert.ok(!planNotifications(n, at(11, 7)).some((x) => x.id.startsWith("event")));
});
