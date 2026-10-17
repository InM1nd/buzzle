/** v1.6 interface style setting: default "auto", kept through save/load, junk falls back; auto follows the Halloween event. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate, newState, setSetting } from "../src/logic/game";
import { resolveTheme } from "../src/logic/uiStyle";

test("ui style: default auto, saved, invalid falls back, old saves get auto", () => {
  const now = Date.now();
  assert.equal(newState(now).settings.ui, "auto");
  const s = setSetting(newState(now), "ui", "midnight");
  assert.equal(migrate(JSON.parse(JSON.stringify(s)), now).settings.ui, "midnight");
  assert.equal(migrate({ ...s, settings: { ...s.settings, ui: "neon" } }, now).settings.ui, "auto");
  const old = JSON.parse(JSON.stringify(newState(now))); delete old.settings.ui;
  assert.equal(migrate(old, now).settings.ui, "auto");
});

test("ui style: resolve — auto follows the event, explicit choices win", () => {
  assert.equal(resolveTheme("auto", true), "midnight");
  assert.equal(resolveTheme("auto", false), "classic");
  assert.equal(resolveTheme("classic", true), "classic");
  assert.equal(resolveTheme("midnight", false), "midnight");
});
