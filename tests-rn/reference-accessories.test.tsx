import React from "react";
import { render } from "@testing-library/react-native";
import ReferenceBeeAccessories, { shouldShowReferenceCrown } from "../src/ui/ReferenceBeeAccessories";

test("Boris unlocks the crown at level 10 and keeps his equipped scarf", async () => {
  const r = await render(<ReferenceBeeAccessories size={154} level={9} />);
  expect(r.queryByTestId("reference-crown")).toBeNull();
  expect(r.queryByTestId("reference-scarf")).toBeNull();
  await r.rerender(<ReferenceBeeAccessories size={154} level={10} skin="scarf" />);
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  expect(r.getByTestId("reference-scarf")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories size={154} level={1} skin="scarf" />);
  expect(r.queryByTestId("reference-crown")).toBeNull();
  expect(r.getByTestId("reference-scarf")).toBeTruthy();
  await r.unmount();
});


test.each(["pushinka", "sonya", "solnyshko", "nochka", "margo"])("%s gets a crown only at maximum level", async beeId => {
  const r = await render(<ReferenceBeeAccessories beeId={beeId} size={154} level={9} skin="scarf" />);
  expect(r.queryByTestId("reference-crown")).toBeNull();
  expect(r.getByTestId("reference-scarf")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories beeId={beeId} size={154} level={10} />);
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.unmount();
});


test.each(["scarf", "glasses"])("%s keeps its crown and disappears when unequipped", async skin => {
  const r = await render(<ReferenceBeeAccessories beeId="pushinka" size={154} level={10} skin={skin} />);
  expect(r.getByTestId(`reference-${skin}`)).toBeTruthy();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories beeId="pushinka" size={154} level={10} />);
  expect(r.queryByTestId(`reference-${skin}`)).toBeNull();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.unmount();
});

test("the saved backpack skin equips a front satchel and strap, and unequips both", async () => {
  const r = await render(<ReferenceBeeAccessories size={154} level={10} skin="backpack" plane="back" />);
  expect(r.queryByTestId("reference-satchel")).toBeNull();
  expect(r.queryByTestId("reference-satchel-strap")).toBeNull();
  expect(r.getByTestId("reference-satchel-shoulder")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories size={154} level={10} skin="backpack" />);
  expect(r.getByTestId("reference-satchel")).toBeTruthy();
  expect(r.getByTestId("reference-satchel-strap")).toBeTruthy();
  expect(r.queryByTestId("reference-satchel-shoulder")).toBeNull();
  expect(r.queryByTestId("reference-backpack")).toBeNull();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories size={154} level={10} />);
  expect(r.queryByTestId("reference-satchel")).toBeNull();
  expect(r.queryByTestId("reference-satchel-strap")).toBeNull();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.rerender(<ReferenceBeeAccessories size={154} level={10} plane="back" />);
  expect(r.queryByTestId("reference-satchel-shoulder")).toBeNull();
  await r.unmount();
});


test.each(["wreath", "beret"])("%s replaces the maximum-level crown and removing it restores the crown", async skin => {
  const r = await render(<ReferenceBeeAccessories beeId="boris" size={154} level={10} skin={skin} />);
  expect(r.getByTestId(`reference-${skin}`)).toBeTruthy();
  expect(r.queryByTestId("reference-crown")).toBeNull();
  expect(shouldShowReferenceCrown(10, skin)).toBe(false);
  await r.rerender(<ReferenceBeeAccessories beeId="boris" size={154} level={10} />);
  expect(r.queryByTestId(`reference-${skin}`)).toBeNull();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.unmount();
});

test("bow keeps the maximum-level crown", async () => {
  const r = await render(<ReferenceBeeAccessories size={154} level={10} skin="bow" />);
  expect(r.getByTestId("reference-bow")).toBeTruthy();
  expect(r.getByTestId("reference-crown")).toBeTruthy();
  await r.unmount();
});
