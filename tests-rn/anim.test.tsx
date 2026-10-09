import React from "react";
import { act, render } from "@testing-library/react-native";
import { BeeSprite, Mascot } from "../src/ui/BeeSprite";
import { _clockRefs, _setAnimActive } from "../src/ui/anim";

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
