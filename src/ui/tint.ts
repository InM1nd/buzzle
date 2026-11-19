import { ImageSourcePropType } from "react-native";

/** Native: `tintColor` is drawn by the platform for free; nothing to pre-render (see tint.web.ts). */
export function useTinted(_src: ImageSourcePropType, _color: string, _on = true): ImageSourcePropType | null {
  return null;
}
