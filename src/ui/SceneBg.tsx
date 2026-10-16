/** v1.6 scene backdrop (hive, garden): the 940×1672 art fitted to the screen width instead of `cover`, so its combs and
 *  rocks read smaller; when the screen is taller than the art, a mirrored copy continues it below without a seam. */
import React, { useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const ASPECT = 1672 / 940;
export function SceneBg({ source }: { source: ImageSourcePropType }) {
  const [w, setW] = useState(0);
  const h = w * ASPECT;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <>
        <Image source={source} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} />
        <Image source={source} style={{ position: "absolute", left: 0, top: h, width: w, height: h, transform: [{ scaleY: -1 }] }} />
      </> : null}
    </View>
  );
}
