import React from "react";
import { Image } from "react-native";
import { TAB_ICON_DATA } from "./tabIconData";

/**
 * Web / Telegram: pre-tinted icons inlined as data URIs.
 * react-native-web's <Image> reloads its URL on every mount and stays blank for good if that one request
 * fails; the tab bar remounts after every puzzle round, so on a flaky mobile connection (Telegram webview)
 * icons used to vanish. Data URIs can't fail, are "loaded" synchronously, and need no SVG tint filter.
 */
export function TabIcon({ id, on }: { id: string; on: boolean }) {
  const d = TAB_ICON_DATA[id];
  return <Image source={{ uri: on ? d.on : d.off }} style={{ width: 26, height: 26 }} />;
}
