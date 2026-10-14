import React, { useId, useMemo, useRef } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, LinearGradient, Path, Stop } from "react-native-svg";
import { useAnimActive, useCycle, useFlapClock } from "./anim";
import ReferenceBeeAccessories, { shouldShowReferenceCrown } from "./ReferenceBeeAccessories";

const ART = {
  zhuzha: require("../../assets/art/bees-prototype/zhuzha-reference.webp"),
  pushinka: require("../../assets/art/bees-prototype/pushinka-reference.webp"),
  solnyshko: require("../../assets/art/bees-prototype/solnyshko-reference.webp"),
  lavanda: require("../../assets/art/bees-prototype/lavanda-reference.webp"),
  klevera: require("../../assets/art/bees-prototype/klevera-reference.webp"),
  vasilek: require("../../assets/art/bees-prototype/vasilek-reference.webp"),
  myatka: require("../../assets/art/bees-prototype/myatka-reference.webp"),
  iskorka: require("../../assets/art/bees-prototype/iskorka-reference.webp"),
  sonya: require("../../assets/art/bees-prototype/sonya-reference.webp"),
  zorkaya: require("../../assets/art/bees-prototype/zorkaya-reference.webp"),
  margo: require("../../assets/art/bees-prototype/margo-reference.webp"),
  nochka: require("../../assets/art/bees-prototype/nochka-reference.webp"),
  boris: require("../../assets/art/bees-prototype/boris-reference-v2.webp"),
};
export type ReferenceBeeId = keyof typeof ART;
export function hasReferenceBee(id: string): id is ReferenceBeeId {
  return Object.prototype.hasOwnProperty.call(ART, id);
}
const ZHUZHA_BASE = require("../../assets/art/bees-prototype/zhuzha-base.webp");
const ZHUZHA_HEAD = "M540 185H980V430H540Z";
const FRAME = 1366;
const OFFSET_Y = (FRAME - 1151) / 2;
// Clip the approved raster at runtime: its colors, facets and facial features stay intact.
const LEFT_WING = "M135 400L325 394L467 493L483 620L465 675L291 735L137 695Z";
const RIGHT_WING = "M981 395L1105 276L1264 311L1306 478L1232 575L1091 614L988 548Z";
const LEFT_EYE = "M731 558L777 578L798 601L798 665L774 690L738 703L703 683L683 663L685 600L708 578Z";
const RIGHT_EYE = "M1014 564L1043 580L1058 603L1058 665L1042 686L1017 700L985 682L970 660L971 609L982 583Z";
// Masks are fitted to each generated sprite; the original Zhuzha is unchanged.
const SHAPES = {
  zhuzha: { leftWing: LEFT_WING, rightWing: RIGHT_WING, leftEye: LEFT_EYE, rightEye: RIGHT_EYE,
    leftRoot: [476, 614], rightRoot: [998, 505], eyeY: [631, 632], colors: ["#FFB12C", "#FFD64C", "#FCD44A"] },
  pushinka: {
    leftWing: "M86 598L124 430L305 398L434 500L451 610L423 684L322 737L201 716Z",
    rightWing: "M992 428L1131 279L1290 315L1323 457L1251 563L1090 622L1042 590Z",
    leftEye: "M721 557L767 568L790 598L789 661L772 688L727 703L690 685L674 660L677 598Z",
    rightEye: "M1000 560L1034 575L1054 603L1055 660L1040 692L1008 699L980 681L966 658L966 607L978 580Z",
    leftRoot: [447, 610], rightRoot: [1038, 525], eyeY: [630, 631], colors: ["#F5DCA2", "#FFEAC0", "#FFEAC0"] },
  solnyshko: { leftWing: LEFT_WING, rightWing: RIGHT_WING, leftEye: LEFT_EYE, rightEye: RIGHT_EYE,
    leftRoot: [476, 614], rightRoot: [998, 505], eyeY: [631, 632], colors: ["#FFE34C", "#FFF17B", "#FFE96B"] },
  lavanda: { leftWing: LEFT_WING,
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: LEFT_EYE,
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#C49AEB", "#DCB9F7", "#D5B0F2"] },
  klevera: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#F98FA9", "#FFBDCB", "#FFB4C4"] },
  vasilek: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#77B8F2", "#A3D9FC", "#9ACFF7"] },
  myatka: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#8ABF95", "#B2E0B8", "#B6E5BC"] },
  iskorka: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#F9684D", "#FD8465", "#FD8667"] },
  sonya: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "",
    rightEye: "",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#77B8F2", "#A3D9FC", "#9ACFF7"] },
  zorkaya: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#1EA4AD", "#5BE1E8", "#60E5EA"] },
  margo: {
    leftWing: "M86 598L124 430L305 398L434 500L451 610L423 684L322 737L201 716Z",
    rightWing: "M992 428L1131 279L1290 315L1323 457L1251 563L1090 622L1042 590Z",
    leftEye: "M721 557L767 568L790 598L789 661L772 688L727 703L690 685L674 660L677 598Z",
    rightEye: "M1000 560L1034 575L1054 603L1055 660L1040 692L1008 699L980 681L966 658L966 607L978 580Z",
    leftRoot: [447, 610], rightRoot: [1038, 525], eyeY: [630, 631], colors: ["#8A59C9", "#9E72E7", "#A57AED"] },
  nochka: { leftWing: "M128 588L170 425L345 391L474 492L483 610L454 670L364 733L226 718Z",
    rightWing: "M988 432L1126 278L1280 311L1320 445L1230 577L1091 608L1042 512Z",
    leftEye: "M732 556L779 576L806 598L806 665L780 699L740 704L708 685L687 662L687 600L711 575Z",
    rightEye: "M1016 564L1047 580L1066 603L1066 665L1047 699L1016 703L987 681L977 660L976 609L988 583Z",
    leftRoot: [476, 614], rightRoot: [1042, 512], eyeY: [631, 632], colors: ["#2B4596", "#3F5FBC", "#4770CF"] },
  boris: {
    leftWing: "M126 472L180 319L344 308L466 398L466 446L445 457L414 485L408 515L390 545L367 579L332 612L221 596Z",
    rightWing: "M1053 418L1139 335L1265 354L1310 471L1241 550L1190 585L1110 552L1118 520L1080 488L1063 454Z",
    leftEye: "M746 463L789 461L824 492L824 550L806 588L753 594L718 567L710 534L713 498Z",
    rightEye: "M1007 478L1041 489L1060 516L1062 570L1047 605L1013 608L987 586L978 559L978 516L989 490Z",
    leftRoot: [435, 465], rightRoot: [1070, 457], eyeY: [529, 544], colors: ["#FFB92B", "#FFD447", "#FFCF42"] },
};

// A small level-five accent keeps the character's wing color and inherits its flap.
function wingTrimPath(bee: ReferenceBeeId, left: boolean) {
  if (bee === "boris") return left
    ? "M145 472L192 335L340 325L448 408L446 449L409 487L395 526L363 564L329 593L230 581Z"
    : "M1070 425L1144 350L1254 367L1293 470L1230 537L1190 568L1123 542L1123 516L1089 481Z";
  if (bee === "pushinka" || bee === "margo") return left
    ? "M105 594L138 444L302 414L419 506L435 607L409 673L320 720L210 700Z"
    : "M1010 437L1135 295L1275 326L1307 456L1239 550L1094 605L1051 581Z";
  return left
    ? "M152 585L184 444L340 414L455 510L466 604L446 658L358 713L233 701Z"
    : "M1006 435L1135 297L1268 324L1303 444L1220 563L1097 590L1051 508Z";
}
function wingSparkPath(bee: ReferenceBeeId, left: boolean) {
  const x = left ? 250 : 1190;
  const y = bee === "boris" ? (left ? 395 : 410) : (left ? 485 : 390);
  return `M${x} ${y - 18}L${x + 5} ${y - 5}L${x + 18} ${y}L${x + 5} ${y + 5}L${x} ${y + 18}L${x - 5} ${y + 5}L${x - 18} ${y}L${x - 5} ${y - 5}Z`;
}

function Layer({ path, size, id, source, children }: { path: string; size: number; id: string; source: number; children?: React.ReactNode }) {
  return <Svg width={size} height={size} viewBox={`0 ${-OFFSET_Y} ${FRAME} ${FRAME}`}>
    <Defs><ClipPath id={id}><Path d={path} clipRule="evenodd" fillRule="evenodd" /></ClipPath></Defs>
    <SvgImage href={source} x={0} y={0} width={FRAME} height={1151} clipPath={`url(#${id})`} />
    {children}
  </Svg>;
}

export default function ReferenceBee({ beeId = "zhuzha", size, on, seed, blink, rest, level = 1, skin, style }: {
  beeId?: ReferenceBeeId; size: number; on: boolean; seed: number; level?: number; skin?: string; blink?: Animated.Value | Animated.AnimatedInterpolation<number>; rest?: Animated.AnimatedInterpolation<number> | Animated.Value;
  style?: StyleProp<ViewStyle>;
}) {
  const shape = SHAPES[beeId];
  const crown = shouldShowReferenceCrown(level, skin);
  const body = `M0 0H1366V1151H0Z ${shape.leftWing} ${shape.rightWing} ${shape.leftEye} ${shape.rightEye} ${beeId === "zhuzha" ? ZHUZHA_HEAD : ""}`;
  const active = useAnimActive();
  const moving = on && active;
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const flap = useFlapClock(seed, moving);
  const idle = useRef(new Animated.Value(0)).current;
  const eyelids = useRef(new Animated.Value(0)).current;
  useCycle(idle, 3800, moving, (seed % 7) / 7);
  useCycle(eyelids, 4300 + (seed % 3) * 300, moving);
  const motion = useMemo(() => {
    const raw = flap.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 15, 0, -15, 0] });
    const wave = rest ? Animated.multiply(raw, Animated.subtract(1, rest)) : raw;
    const autoBlink = eyelids.interpolate({ inputRange: [0, 0.46, 0.48, 0.50, 0.525, 1], outputRange: [0, 0, 1, 1, 0, 0] });
    const closure = blink ?? autoBlink;
    return {
      left: wave.interpolate({ inputRange: [-15, 15], outputRange: ["-15deg", "15deg"] }),
      right: wave.interpolate({ inputRange: [-15, 15], outputRange: ["15deg", "-15deg"] }),
      squash: flap.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.64, 1, 0.64, 1] }),
      bob: idle.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, size * 0.009, 0, -size * 0.009, 0] }),
      tilt: idle.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "1deg", "0deg", "-1deg", "0deg"] }),
      eyeScale: closure.interpolate({ inputRange: [0, 1], outputRange: [1, 0.035] }),
    };
  }, [flap, idle, eyelids, blink, rest, size]);
  const wing = (left: boolean) => {
    const px = (left ? shape.leftRoot[0] : shape.rightRoot[0]) / FRAME * size;
    const py = ((left ? shape.leftRoot[1] : shape.rightRoot[1]) + OFFSET_Y) / FRAME * size;
    return <Animated.View key={left ? "left" : "right"} style={{ position: "absolute", width: size, height: size,
      left: px - size / 2, top: py - size / 2,
      transform: moving ? [{ rotate: left ? motion.left : motion.right }, { scaleY: motion.squash }] : [] }}>
      <View style={{ position: "absolute", left: size / 2 - px, top: size / 2 - py }}>
        <Layer source={ART[beeId]} path={left ? shape.leftWing : shape.rightWing} size={size} id={`${id}-${left ? "l" : "r"}`}>
          {level >= 5 && <>
            <Path d={wingTrimPath(beeId, left)} fill="none" stroke="#E8B95E" strokeWidth={6} strokeLinejoin="round" opacity={0.8} />
            <Path d={wingSparkPath(beeId, left)} fill="#FFF4C4" opacity={0.9} />
          </>}
        </Layer>
      </View>
    </Animated.View>;
  };
  const eye = (left: boolean) => {
    const cy = ((left ? shape.eyeY[0] : shape.eyeY[1]) + OFFSET_Y) / FRAME * size;
    return <Animated.View key={left ? "el" : "er"} style={{ position: "absolute", width: size, height: size,
      top: cy - size / 2, transform: moving ? [{ scaleY: motion.eyeScale }] : [] }}>
      <View style={{ position: "absolute", top: size / 2 - cy }}>
        <Layer source={ART[beeId]} path={left ? shape.leftEye : shape.rightEye} size={size} id={`${id}-${left ? "el" : "er"}`} />
      </View>
    </Animated.View>;
  };
  return <View testID="reference-bee" accessibilityLabel={beeId} pointerEvents="none" style={[{ width: size, height: size }, style]}>
    <Animated.View style={{ width: size, height: size, transform: moving ? [{ translateY: motion.bob }, { rotate: motion.tilt }] : [] }}>
      <ReferenceBeeAccessories beeId={beeId} size={size} level={level} skin={skin} plane="back" />
      {wing(true)}{wing(false)}
      <View style={{ position: "absolute" }}>
        <Layer source={ART[beeId]} path={body} size={size} id={`${id}-body`}>
          <Defs>
            <LinearGradient id={`${id}-gold`} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor={shape.colors[0]} /><Stop offset="1" stopColor={shape.colors[1]} /></LinearGradient>
          </Defs>
          {beeId !== "sonya" && <>
            <Path d={shape.leftEye} fill={`url(#${id}-gold)`} />
            <Path d={shape.rightEye} fill={shape.colors[2]} />
          </>}
        </Layer>
      </View>
      {/* Sonya keeps her peaceful closed eyes; only her body and wings move. */}
      {beeId !== "sonya" && <>{eye(true)}{eye(false)}</>}
      {beeId === "zorkaya" && <View testID={skin === "glasses" ? "reference-glasses" : "character-glasses"} style={{ position: "absolute" }}>
        <Layer source={ART.zorkaya} size={size} id={`${id}-glasses`}
          path="M648 621A96 100 0 1 0 840 621A96 100 0 1 0 648 621Z M670 621A74 80 0 1 0 818 621A74 80 0 1 0 670 621Z M936 622A80 91 0 1 0 1096 622A80 91 0 1 0 936 622Z M956 622A60 72 0 1 0 1076 622A60 72 0 1 0 956 622Z" />
      </View>}
      {beeId === "zhuzha" && <View testID={crown ? "reference-crown" : "reference-bare-head"} style={{ position: "absolute" }}>
        <Layer source={crown ? ART.zhuzha : ZHUZHA_BASE} path={ZHUZHA_HEAD} size={size} id={`${id}-head`} />
      </View>}
      <ReferenceBeeAccessories beeId={beeId} size={size} level={level} skin={skin} />
      {/* The stems emerge through the beret surface, rather than behind its rim. */}
      {skin === "beret" && <View testID="reference-beret-antennae" style={{ position: "absolute" }}>
        <Layer source={beeId === "zhuzha" ? ZHUZHA_BASE : ART[beeId]} size={size} id={`${id}-hat-antennae`}
          path={beeId === "solnyshko" ? "M430 0H700V285H430Z M800 0H1100V220H800Z" : "M430 0H1100V285H430Z"} />
      </View>}
    </Animated.View>
  </View>;
}
