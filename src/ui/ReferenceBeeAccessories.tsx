import React, { useId } from "react";
import { SKIN_BY_ID } from "../logic/loot";
import { View } from "react-native";
import Svg, { ClipPath, Defs, G, Path, Rect, Circle, Image as SvgImage } from "react-native-svg";

const CROWN = require("../../assets/art/bees-prototype/crown-fitted-v3.webp");
const SCARF = require("../../assets/art/bees-prototype/scarf-fitted-v4.webp");
const GLASSES = require("../../assets/art/bees-prototype/glasses-accessory.webp");
const SATCHEL = require("../../assets/art/bees-prototype/satchel-left-accessory.webp");
const COLLAR_ART: Record<string, number> = { pushinka: require("../../assets/art/bees-prototype/pushinka-reference.webp"), margo: require("../../assets/art/bees-prototype/margo-reference.webp") };
const SATCHEL_BOUNDS = require("../../assets/art/bees-prototype/satchel-left-bounds.json");
const BOW = require("../../assets/art/bees-prototype/bow-accessory.webp");
const WREATH = require("../../assets/art/bees-prototype/wreath-fitted-v2.webp");
const BERET = require("../../assets/art/bees-prototype/beret-accessory.webp");
const SKIN_BOUNDS = require("../../assets/art/bees-prototype/skin-accessory-bounds.json");
const BOUNDS = require("../../assets/art/bees-prototype/fitted-accessory-bounds-v4.json");

// Match Zhuzha’s seated front band; do not show an empty lower ring.
const CROWN_MOUNTS: Record<string, [number, number, number, number]> = {
  pushinka: [560, 190, 400, 233],
  boris: [615, 166, 410, 239],
  solnyshko: [560, 190, 400, 233],
  lavanda: [560, 190, 400, 233],
  klevera: [560, 190, 400, 233],
  vasilek: [560, 190, 400, 233],
  myatka: [560, 190, 400, 233],
  iskorka: [560, 190, 400, 233],
  sonya: [560, 172, 400, 233],
  zorkaya: [560, 190, 400, 233],
  margo: [560, 190, 400, 233],
  nochka: [560, 190, 400, 233],
};
const SCARF_MOUNTS: Record<string, [number, number, number, number]> = {
  zhuzha: [365, 690, 835, 280],
  pushinka: [350, 770, 860, 275],
  boris: [285, 650, 950, 290],
  solnyshko: [365, 690, 835, 280],
  lavanda: [365, 690, 835, 280],
  klevera: [365, 690, 835, 280],
  vasilek: [365, 690, 835, 280],
  myatka: [365, 690, 835, 280],
  iskorka: [365, 690, 835, 280],
  sonya: [365, 690, 835, 280],
  zorkaya: [365, 690, 835, 280],
  margo: [350, 770, 860, 275],
  nochka: [365, 690, 835, 280],
};

export function shouldShowReferenceCrown(level: number, skin?: string) {
  return level >= 10 && !SKIN_BY_ID[skin ?? ""]?.hat;
}

export default function ReferenceBeeAccessories({ size, level, skin, beeId = "boris", plane = "front" }: { size: number; level: number; skin?: string; beeId?: string; plane?: "front" | "back" }) {
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const layer = (name: "crown" | "scarf" | "glasses" | "satchel" | "bow" | "wreath" | "beret", source: number, x: number, y: number, w: number, h: number) => {
    const bounds = name === "satchel" ? SATCHEL_BOUNDS : name === "crown" || name === "scarf" ? BOUNDS[name] : SKIN_BOUNDS[name];
    // Raise only the wrap’s left side, anchored before the knot. Keep its pixel scale
    // and add headroom so the lifted edge is never clipped by the SVG viewport.
    const lift = name === "scarf" || name === "wreath" ? 140 : 0;
    const [bx, by, bw, bh] = bounds.box;
    const frameY = y - lift / bh * h;
    const frameH = h * (bh + lift) / bh;
    return <View key={name} testID={`reference-${name}`} style={{ position: "absolute",
      left: x / 1366 * size, top: (frameY + 107.5) / 1366 * size, width: w / 1366 * size, height: frameH / 1366 * size, transform: name === "bow" ? [{ rotate: "15deg" }] : [] }}>
      <Svg width="100%" height="100%" viewBox={[bx, by - lift, bw, bh + lift].join(" ")} preserveAspectRatio="none">
        {name === "wreath" ? <>
          <Defs>
            <ClipPath id={`wreath-left-${clipId}`}><Rect width={769} height={bounds.height} /></ClipPath>
            <ClipPath id={`wreath-right-${clipId}`}><Rect x={769} width={bounds.width - 769} height={bounds.height} /></ClipPath>
          </Defs>
          {/* Lift the low centre to remove the wreath's upturned ends. The two
              halves meet at the same height, preserving a continuous band. */}
          <G transform="matrix(1 -0.2 0 1 0 14)">
            <SvgImage href={source} width={bounds.width} height={bounds.height} clipPath={`url(#wreath-left-${clipId})`} />
          </G>
          <G transform="matrix(1 0.2 0 1 0 -294)">
            <SvgImage href={source} width={bounds.width} height={bounds.height} clipPath={`url(#wreath-right-${clipId})`} />
          </G>
        </> : name === "scarf" ? <>
          <Defs>
            <ClipPath id={`wrap-${clipId}`}><Rect x={0} y={0} width={950} height={bounds.height} /></ClipPath>
            <ClipPath id={`knot-${clipId}`}><Rect x={950} y={0} width={bounds.width - 950} height={bounds.height} /></ClipPath>
          </Defs>
          <G transform="matrix(1 0.12 0 1 0 -114)">
            <SvgImage href={source} x={0} y={0} width={bounds.width} height={bounds.height} clipPath={`url(#wrap-${clipId})`} />
          </G>
          <SvgImage href={source} x={0} y={0} width={bounds.width} height={bounds.height} clipPath={`url(#knot-${clipId})`} />
        </> : <SvgImage href={source} x={0} y={0} width={bounds.width} height={bounds.height} />}
      </Svg>
    </View>;
  };
  const mount = CROWN_MOUNTS[beeId] ?? [560, 190, 400, 233];
  const collar = beeId === "pushinka" || beeId === "margo";
  const scarf: [number, number, number, number] = SCARF_MOUNTS[beeId] ?? SCARF_MOUNTS.zhuzha;
  const glasses: [number, number, number, number] = beeId === "boris" ? [580, 438, 535, 180] : [collar ? 531 : 545, 532, 573, 195];
  // Seat headwear around the same head centre as the approved crown.
  // Keep the saved skin id; hang the bag at the visible left hip.
  const satchel: [number, number, number, number] = beeId === "boris" ? [295, 820, 335, 245] : [340, 840, 310, 230];
  const shoulderX = beeId === "boris" ? 1110 : 1080;
  const shoulderY = beeId === "boris" ? 750 : 785;
  const anchorX = satchel[0] + satchel[2] - 23;
  const anchorY = satchel[1] + 23;
  const strapPath = `M${shoulderX} ${shoulderY} C${shoulderX - 95} ${shoulderY + 80} ${anchorX + 180} ${anchorY + 25} ${anchorX} ${anchorY + 8}`;
  const bow: [number, number, number, number] = beeId === "boris" ? [710, 760, 300, 236] : [collar ? 715 : 720, collar ? 845 : 795, 270, 213];
  const hat: [number, number, number, number] = beeId === "boris" ? [595, 235, 450, 195] : [540, beeId === "sonya" ? 245 : 265, 440, 195];
  const beret: [number, number, number, number] = beeId === "boris" ? [570, 205, 540, 230] : beeId === "solnyshko" ? [510, 185, 540, 245] : [510, beeId === "sonya" ? 190 : 210, 540, 230];
  if (plane === "back") return skin === "backpack" ? <View testID="reference-satchel-shoulder" style={{ position: "absolute", width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 -107.5 1366 1366">
      <Path d={`M${shoulderX - 25} ${shoulderY - 125} Q${shoulderX + 35} ${shoulderY - 75} ${shoulderX} ${shoulderY + 5}`} fill="none" stroke="#805333" strokeWidth={30} />
      <Path d={`M${shoulderX - 25} ${shoulderY - 125} Q${shoulderX + 35} ${shoulderY - 75} ${shoulderX} ${shoulderY + 5}`} fill="none" stroke="#C49460" strokeWidth={18} />
    </Svg>
  </View> : null;
  return <>
    {skin === "backpack" && <View testID="reference-satchel-strap" style={{ position: "absolute", width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 -107.5 1366 1366">
        <Path d={strapPath} fill="none" stroke="#805333" strokeWidth={30} />
        <Path d={strapPath} fill="none" stroke="#C49460" strokeWidth={18} />
        {collar && <>
          <Defs><ClipPath id={`collar-${clipId}`}><Path d="M555 722L611 720L661 754L701 751L754 778L800 775L855 795L912 785L964 790L1004 752L1044 752L1097 707L1121 720L1124 762L1101 796L1087 842L1050 848L1005 872L954 861L915 890L854 875L808 884L759 861L706 868L656 840L609 809L570 796Z" /></ClipPath></Defs>
          <SvgImage href={COLLAR_ART[beeId]} width={1366} height={1151} clipPath={`url(#collar-${clipId})`} />
        </>}
      </Svg>
    </View>}
    {skin === "backpack" && <>
      {layer("satchel", SATCHEL, ...satchel)}
      <View testID="reference-satchel-attachment" style={{ position: "absolute", width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 -107.5 1366 1366">
          <Circle cx={anchorX} cy={anchorY + 8} r={13} fill="none" stroke="#A77232" strokeWidth={7} />
          <Circle cx={anchorX} cy={anchorY + 8} r={11} fill="none" stroke="#E9BD6A" strokeWidth={4} />
        </Svg>
      </View>
    </>}
    {skin === "scarf" && layer("scarf", SCARF, ...scarf)}
    {skin === "glasses" && beeId !== "zorkaya" && layer("glasses", GLASSES, ...glasses)}
    {skin === "bow" && layer("bow", BOW, ...bow)}
    {skin === "wreath" && layer("wreath", WREATH, ...hat)}
    {skin === "beret" && layer("beret", BERET, ...beret)}
    {beeId !== "zhuzha" && shouldShowReferenceCrown(level, skin) && layer("crown", CROWN, ...mount)}
  </>;
}
