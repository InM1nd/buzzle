import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import { BeeSprite, Mascot } from "../src/ui/BeeSprite";
import { outfitLayers } from "../src/ui/TurnBee";

test.each(["zhuzha", "pushinka", "boris"])("%s portrait ignores flight direction and stays front-facing", async id => {
 const r = await render(<BeeSprite id={id} size={176} flap={false} turn={new Animated.Value(1)} level={10} skin="scarf" />);
 expect(r.getByTestId("bee-view-front")).toBeTruthy();
 expect(r.queryByTestId("bee-view-side")).toBeNull();
 expect(r.getByTestId("bee-crown")).toBeTruthy();
 expect(r.getByTestId("bee-scarf")).toBeTruthy();
 await r.rerender(<BeeSprite id={id} size={176} flap={false} level={10} />);
 expect(r.queryByTestId("bee-scarf")).toBeNull();
 expect(r.getByTestId("bee-crown")).toBeTruthy();
 await r.unmount();
});
test.each(["wreath", "beret"])("%s replaces the crown", async skin => {
 const r=await render(<BeeSprite id="boris" size={100} flap={false} level={10} skin={skin} />);
 expect(r.getByTestId(`bee-${skin}`)).toBeTruthy();
 expect(r.queryByTestId("bee-crown")).toBeNull();
 await r.unmount();
});
test("satchel keeps the saved backpack ID and removing it removes the layer", async()=>{
 const r=await render(<BeeSprite id="pushinka" size={100} flap={false} skin="backpack" />);
 expect(r.getByTestId("bee-backpack")).toBeTruthy();
 await r.rerender(<BeeSprite id="pushinka" size={100} flap={false} />);
 expect(r.queryByTestId("bee-backpack")).toBeNull();await r.unmount();
});
test("locked portrait and mascot are still, front-facing", async()=>{
 const r=await render(<BeeSprite id="boris" size={100} tint="#ccc" level={10} skin="scarf" turn={1} />);
 expect(r.getByTestId("bee-view-front")).toBeTruthy();expect(r.queryByTestId("bee-crown")).toBeNull();
 await r.rerender(<Mascot size={176} />);expect(r.getByTestId("bee-view-front")).toBeTruthy();await r.unmount();
});
test("archived headphones never become an active outfit",()=>{
 expect(outfitLayers(10,"headphones")).toEqual(["crown"]);
 expect(outfitLayers(10,"scarf")).toEqual(["crown","scarf"]);
});
