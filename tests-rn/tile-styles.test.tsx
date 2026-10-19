import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { newState } from "../src/logic/game";
import { setLang } from "../src/i18n";
import { forceEvent } from "../src/logic/event";
import { SettingsModal, SettingsProps } from "../src/screens/Settings";
import { ART, seasonalTiles, setTileStyle, TILE_SETS } from "../src/ui/art";

function props(dev: boolean): SettingsProps {
  return {
    visible: true, s: newState(Date.now()), dev, notifBlocked: false,
    updater: { enabled: false, latest: null, available: false, checking: false, error: false, check: async () => null },
    onSet: jest.fn(), onLang: jest.fn(), onNotifications: jest.fn(), onTutorial: jest.fn(),
    onWhatsNew: jest.fn(), onReset: jest.fn(), onClose: jest.fn(), getCode: () => "",
    onImport: () => null,
  };
}

beforeEach(() => { setLang("ru"); forceEvent(false); });
afterEach(() => { forceEvent(null); setTileStyle("soft"); });

test("new styles are selectable in dev settings and hidden in regular settings", async () => {
  const p = props(true);
  const view = await render(<SettingsModal {...p} />);
  await fireEvent.press(screen.getByLabelText("Медовый · мягче"));
  expect(p.onSet).toHaveBeenCalledWith("tiles", "balanced");
  await fireEvent.press(screen.getByLabelText("Медовый · грани"));
  expect(p.onSet).toHaveBeenCalledWith("tiles", "faceted");
  await view.rerender(<SettingsModal {...props(false)} />);
  expect(screen.queryByLabelText("Медовый · мягче")).toBeNull();
  expect(screen.queryByLabelText("Медовый · грани")).toBeNull();
});

test.each(["balanced", "faceted"] as const)("%s switches every sprite to its Halloween set and back", (style) => {
  setTileStyle(seasonalTiles(style, true));
  const night = TILE_SETS[style === "balanced" ? "hbalanced" : "hfaceted"];
  expect(ART.cells).toBe(night.cells);
  expect(ART.wild).toBe(night.wild);
  expect(ART.bomb).toBe(night.bomb);
  expect(ART.pumpkin).toBe(night.pumpkin);
  setTileStyle(seasonalTiles(style, false));
  expect(ART.cells).toBe(TILE_SETS[style].cells);
  expect(ART.bomb).toBe(TILE_SETS[style].bomb);
});
