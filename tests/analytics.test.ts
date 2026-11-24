/** Issue #3: anonymous retention analytics — id, migration, state-diff events. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffEvents, EVENTS, isAnalyticsId, newAnalyticsId } from "../src/logic/analytics";
import { GameState, migrate, newState, setSetting } from "../src/logic/game";

const T = new Date(2026, 9, 28, 12).getTime();
const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

test("random id: valid, unique, kept by migrate", () => {
  const a = newAnalyticsId(), b = newAnalyticsId();
  assert.ok(isAnalyticsId(a)); assert.notEqual(a, b);
  assert.ok(!isAnalyticsId("x")); assert.ok(!isAnalyticsId(42));
  const s = newState(T);
  assert.ok(isAnalyticsId(s.aid));
  assert.equal(migrate(JSON.parse(JSON.stringify(s)), T).aid, s.aid);
  const old: any = clone(s); delete old.aid;
  assert.ok(isAnalyticsId(migrate(old, T).aid));
});

test("opt-out setting defaults on and survives migrate", () => {
  const s = newState(T);
  assert.equal(s.settings.analytics, true);
  const off = setSetting(s, "analytics", false);
  assert.equal(migrate(clone(off), T).settings.analytics, false);
});

test("no events for unchanged state", () => {
  const s = newState(T);
  assert.deepEqual(diffEvents(s, clone(s)), []);
});

test("streak day, break and freeze", () => {
  const a = newState(T);
  a.daily.lastDay = 100; a.daily.streak = 5; a.daily.best = 5; a.daily.freeze = 1;
  const next = clone(a); next.daily.lastDay = 101; next.daily.streak = 6; next.daily.best = 6;
  assert.deepEqual(diffEvents(a, next).map((e) => e.event), ["streak_day"]);
  const fr = clone(next); fr.daily.freeze = 0;
  assert.deepEqual(diffEvents(a, fr).map((e) => e.event), ["streak_freeze_used", "streak_day"]);
  const br = clone(a); br.daily.lastDay = 105; br.daily.streak = 1;
  const ev = diffEvents(a, br);
  assert.deepEqual(ev.map((e) => e.event), ["streak_break", "streak_day"]);
  assert.equal(ev[0].props?.previous, 5);
});

test("event points only within one event", () => {
  const a = newState(T);
  const b = clone(a); b.event.points = a.event.points + 7;
  const ev = diffEvents(a, b).filter((e) => e.event === "event_points");
  assert.equal(ev.length, 1); assert.equal(ev[0].props?.points, 7);
  const c = clone(b); c.event.id = "other";
  assert.equal(diffEvents(a, c).filter((e) => e.event === "event_points").length, 0);
});

test("event names are all known", () => {
  assert.equal(new Set(EVENTS).size, 8);
});
