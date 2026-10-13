import React from "react";
import { Animated } from "react-native";
import { act, render } from "@testing-library/react-native";
import { BeeSprite, Mascot } from "../src/ui/BeeSprite";
import { _clockRefs, _setAnimActive, useFlapClock } from "../src/ui/anim";

const total = () => _clockRefs().reduce((a, b) => a + b, 0);

test("wing clocks are shared and released on unmount", async () => {
  const r = await render(
    <>
      {Array.from({ length: 9 }, (_, i) => <BeeSprite key={i} id="zhuzha" size={40} seed={i} />)}
    </>,
  );
  expect(total()).toBe(9);
  expect(_clockRefs()).toEqual([3, 3, 3]);
  await r.unmount();
  expect(total()).toBe(0);
});

test("silhouettes and static icons do not animate", async () => {
  const r = await render(<><BeeSprite id="boris" size={60} tint="#ccc" /><BeeSprite id="margo" size={44} flap={false} /></>);
  expect(total()).toBe(0);
  await r.unmount();
});

test("animations pause while the app is in the background", async () => {
  const r = await render(<Mascot id="zhuzha" size={120} />);
  expect(total()).toBe(1);
  await act(async () => { _setAnimActive(false); });
  expect(total()).toBe(0);
  await act(async () => { _setAnimActive(true); });
  expect(total()).toBe(1);
  await r.unmount();
  expect(total()).toBe(0);
});

test("wing clock restarts from zero after stopping at the end of a cycle", async () => {
  let clock!: Animated.Value;
  function Probe() {
    clock = useFlapClock(0);
    return null;
  }
  const r = await render(<Probe />);
  let value = 1;
  const listener = clock.addListener((event) => { value = event.value; });
  await act(async () => { _setAnimActive(false); });
  await act(async () => { clock.setValue(1); });
  await act(async () => { _setAnimActive(true); });
  expect(value).toBeLessThan(1);
  clock.removeListener(listener);
  await r.unmount();
  expect(total()).toBe(0);
});
