import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { newState } from "../src/logic/game";
import { setLang } from "../src/i18n";
import { forceEvent } from "../src/logic/event";
import { SettingsModal, SettingsProps } from "../src/screens/Settings";
import { ART, seasonalTiles, setTileStyle, TILE_SETS } from "../src/ui/art";

function props(dev: boolean): SettingsProps {
  return {
    visible: true, s: { ...newState(Date.now()), settings: { ...newState(Date.now()).settings, tiles: "classic" } }, dev, notifBlocked: false,
    updater: { enabled: false, latest: null, available: false, checking: false, error: false, check: async () => null },
    onSet: jest.fn(), onLang: jest.fn(), onNotifications: jest.fn(), onTutorial: jest.fn(),
    onWhatsNew: jest.fn(), onReset: jest.fn(), onClose: jest.fn(), getCode: () => "",
    onImport: () => null,
  };
}

beforeEach(() => { setLang("ru"); forceEvent(false); });
afterEach(() => { forceEvent(null); setTileStyle("mellow"); });

test.each([true, false])("exactly the five selected styles are available (dev=%s)", async (dev) => {
  const p = props(dev);
  await render(<SettingsModal {...p} />);
  // the main list has one row; the picker page previews a style and applies it on "Применить"
  await fireEvent.press(screen.getByLabelText("Соты головоломки: Яркие (1.5)"));
  expect(screen.getAllByRole("radio")).toHaveLength(5);
  expect(screen.queryByLabelText("Мягкий кристалл")).toBeNull();
  expect(screen.queryByLabelText("Медовый · грани")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Медовый · мягче"));
  expect(p.onSet).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Применить"));
  expect(p.onSet).toHaveBeenCalledWith("tiles", "balanced");
  await fireEvent.press(screen.getByLabelText("Яркие · спокойнее"));
  await fireEvent.press(screen.getByLabelText("Применить"));
  expect(p.onSet).toHaveBeenCalledWith("tiles", "mellow");
});

test.each(["classic", "pastel", "wax", "balanced", "mellow"] as const)("%s switches every sprite to its Halloween set and back", (style) => {
  setTileStyle(seasonalTiles(style, true));
  const night = TILE_SETS[seasonalTiles(style, true)];
  expect(ART.cells).toBe(night.cells);
  expect(ART.wild).toBe(night.wild);
  expect(ART.bomb).toBe(night.bomb);
  expect(ART.pumpkin).toBe(night.pumpkin);
  setTileStyle(seasonalTiles(style, false));
  expect(ART.cells).toBe(TILE_SETS[style].cells);
  expect(ART.bomb).toBe(TILE_SETS[style].bomb);
});

test("legacy and invalid style IDs resolve safely without bundled archived sprites", () => {
  expect(seasonalTiles("soft", false)).toBe("mellow");
  expect(seasonalTiles("soft", true)).toBe("hmellow");
  expect(seasonalTiles("faceted", false)).toBe("balanced");
  expect(seasonalTiles("faceted", true)).toBe("hbalanced");
  expect(seasonalTiles("unknown", true)).toBe("hmellow");
  expect(seasonalTiles("toString", false)).toBe("mellow");
  expect(TILE_SETS).not.toHaveProperty("soft");
  expect(TILE_SETS).not.toHaveProperty("faceted");
});
