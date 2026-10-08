import { Platform, TextStyle } from "react-native";

export const C = {
  bg: "#FFF6E3",
  bg2: "#FFEFD0",
  card: "#FFFFFF",
  cardWarm: "#FFF9EE",
  text: "#4A2C12",
  dim: "#9C7B5B",
  faint: "#C9AE8C",
  line: "#F1DFC0",
  honey: "#FFB51F",
  honeyDeep: "#F08A00",
  honeyDark: "#C26A00",
  jelly: "#A77BEA",
  green: "#3DBE6A",
  greenDark: "#2A9551",
  red: "#F0533A",
  brown: "#7A4A1E",
  board: "#F7DFAE",
  boardEdge: "#E8C27E",
  pollen: ["#FFC233", "#FF6FA3", "#9B74F2", "#3FA2FF", "#47C97E"],
};

const fam = Platform.OS === "ios" ? undefined : "Nunito";
export const F = {
  bold: { fontFamily: fam, fontWeight: "700" } as TextStyle,
  xbold: { fontFamily: fam, fontWeight: "800" } as TextStyle,
  black: { fontFamily: fam, fontWeight: "900" } as TextStyle,
};

export const shadow = {
  shadowColor: "#7A4A1E",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
