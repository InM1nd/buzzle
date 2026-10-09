import React from "react";
import { Image } from "react-native";
import { ART } from "./art";

const SRC: Record<string, number> = { hive: ART.tabHive, puzzle: ART.tabPuzzle, bees: ART.tabBee, tasks: ART.tabTasks, loot: ART.tabBox };
/** Bottom-bar icon (native: tinted bundled asset). The web build uses TabIcon.web.tsx. */
export function TabIcon({ id, on }: { id: string; on: boolean }) {
  return <Image source={SRC[id]} style={{ width: 26, height: 26, tintColor: on ? "#fff" : "#C49A62" }} />;
}
