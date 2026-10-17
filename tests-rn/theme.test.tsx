import { C, K, setTheme, themed, themeName, activeCard } from "../src/ui/theme";
import { StyleSheet } from "react-native";

afterEach(() => { setTheme("classic"); });

test("classic is the default and K leaves literal colours untouched", () => {
  expect(themeName()).toBe("classic");
  expect(K.bg("#fff")).toBe("#fff");
  expect(K.bd("#F6DDA6")).toBe("#F6DDA6");
  expect(K.fg("#4A2C12")).toBe("#4A2C12");
  expect(activeCard()).toBeNull();
  expect(C.card).toBe("#FFFFFF");
});

test("midnight swaps tokens, maps literals and glows the active card; themed() sheets rebuild", () => {
  const styles = themed(() => StyleSheet.create({ a: { backgroundColor: C.card, color: K.fg("#4A2C12") } }));
  expect(styles.a.backgroundColor).toBe("#FFFFFF");
  expect(setTheme("midnight")).toBe(true);
  expect(setTheme("midnight")).toBe(false);
  expect(styles.a.backgroundColor).toBe("#221C4D");
  expect(styles.a.color).toBe("#FFE8C2");
  expect(K.bg("#fff")).toBe("#221C4D");
  expect(activeCard()?.borderColor).toBe("#FF9A3D");
  setTheme("classic");
  expect(styles.a.backgroundColor).toBe("#FFFFFF");
});
