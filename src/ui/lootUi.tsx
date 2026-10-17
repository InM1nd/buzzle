/** v1.3 shared bits for the surprise-comb screens: rarity colours (= pollen colours), item / drop icons and labels. */
import { t } from "../i18n";
import React from "react";
import { Image, View } from "react-native";
import { BoosterId, BOOSTERS, Drop, ITEM_BY_ID, Rarity, RARITY_NAME } from "../logic/loot";
import { FLOWER_BY_ID } from "../logic/garden";
import { ART } from "./art";
import { GARDEN_ART, ITEM_ART } from "./beeArt";
import { BeeSprite } from "./BeeSprite";
import { fmt } from "./components";
import { isNight } from "./theme";

/** frame colours follow the pollen colours of the puzzle */
const RUI = {
  common: { c: "#2FA864", bg: "#E4F7EA", nc: "#7FE0A4", nbg: "rgba(61,190,106,0.20)" },
  rare: { c: "#2E8BEA", bg: "#E1EEFC", nc: "#8CC4FF", nbg: "rgba(80,150,255,0.22)" },
  epic: { c: "#8A5BE6", bg: "#EFE6FF", nc: "#C9A8FF", nbg: "rgba(167,123,234,0.26)" },
  legendary: { c: "#E09A00", bg: "#FFF0C7", nc: "#FFD27A", nbg: "rgba(255,181,31,0.22)" },
};
const rui = (r: Rarity) => ({
  get color() { return isNight() ? RUI[r].nc : RUI[r].c; },
  get bg() { return isNight() ? RUI[r].nbg : RUI[r].bg; },
  get name() { return RARITY_NAME[r]; },
});
export const RARITY_UI: Record<Rarity, { color: string; bg: string; name: string }> = {
  common: rui("common"), rare: rui("rare"), epic: rui("epic"), legendary: rui("legendary"),
};
export const BOOSTER_ART: Record<BoosterId, number> = { moves: ART.boostMoves, bomb: require("../../assets/art/boost_bomb.webp"), shuffle: ART.boostShuffle };
export const boxArt = (kind: string, dmg = 0) => (dmg > 0 && ITEM_ART[`box_${kind}_d${Math.min(2, dmg)}`]?.src) || ITEM_ART[`box_${kind}`]?.src;

/** picture of a collectible (skin on Zhuzha, decoration, rare flower, night bee) */
export function ItemIcon({ id, size, locked }: { id: string; size: number; locked?: boolean }) {
  const it = ITEM_BY_ID[id];
  const tint = locked ? (isNight() ? "#32296D" : "#D8C29C") : undefined;
  if (!it) return <View style={{ width: size, height: size }} />;
  if (it.kind === "skin") return <BeeSprite id="zhuzha" size={size * 1.15} skin={locked ? undefined : id} tint={tint} flap={false} style={{ margin: -size * 0.075 }} />;
  if (it.kind === "bee") return <BeeSprite id={id} size={size * 1.15} tint={tint} flap={false} style={{ margin: -size * 0.075 }} />;
  const src = it.kind === "deco" ? ITEM_ART[`deco_${id}`]?.src : GARDEN_ART[`${id}_bloom`];
  return <Image source={src} style={{ width: size, height: size, tintColor: tint }} resizeMode="contain" />;
}

export function DropIcon({ d, size }: { d: Drop; size: number }) {
  switch (d.t) {
    case "honey": return <Image source={ART.honey} style={{ width: size, height: size }} />;
    case "nectar": return <Image source={ART.nectar} style={{ width: size, height: size }} />;
    case "jelly": return <Image source={ART.jelly} style={{ width: size, height: size }} />;
    case "seed": return (
      <View style={{ width: size, height: size }}>
        <Image source={GARDEN_ART[`${d.flower}_bloom`]} style={{ width: size, height: size }} resizeMode="contain" />
        <Image source={ART.seed} style={{ position: "absolute", right: -2, bottom: -2, width: size * 0.42, height: size * 0.42 }} />
      </View>
    );
    case "item": return <ItemIcon id={d.id} size={size} />;
    case "booster": return <Image source={BOOSTER_ART[d.b]} style={{ width: size, height: size }} resizeMode="contain" />;
    case "fragment": return <Image source={ART.fragment} style={{ width: size, height: size }} />;
    case "box": return <Image source={boxArt(d.kind)} style={{ width: size * 1.1, height: size * 1.1, margin: -size * 0.05 }} />;
  }
}

export function dropTitle(d: Drop): string {
  switch (d.t) {
    case "honey": return t("drop.honey", { n: fmt(d.n) });
    case "nectar": return t("drop.nectar", { n: d.n });
    case "jelly": return t("drop.jelly", { n: d.n });
    case "seed": return `${FLOWER_BY_ID[d.flower]?.name ?? d.flower}${d.n > 1 ? ` ×${d.n}` : ""}`;
    case "item": return ITEM_BY_ID[d.id]?.name ?? d.id;
    case "booster": return `${BOOSTERS[d.b].name}${d.n > 1 ? ` ×${d.n}` : ""}`;
    case "fragment": return t("drop.fragment", { n: d.n });
    case "box": return t("drop.box");
  }
}
export function dropSub(d: Drop): string | null {
  if (d.t === "item") return d.dup ? t("drop.dup", { n: d.pollen ?? 0 }) : t("drop.new");
  if (d.t === "seed") return FLOWER_BY_ID[d.flower]?.rare ? t("drop.rareSeeds") : t("drop.seeds");
  if (d.t === "fragment") return d.pollen ? t("drop.fragPollen", { n: d.pollen }) : t("drop.fragOf");
  if (d.t === "booster") return t("drop.booster");
  if (d.t === "box") return t("drop.boxInside");
  return null;
}
export const isResource = (d: Drop) => d.t === "honey" || d.t === "nectar" || d.t === "jelly";

/** v1.3: owned decorations standing by the hive / in the garden (toggled in the album). */
export function DecoStrip({ ids, ground }: { ids: string[]; ground: string }) {
  if (!ids.length) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-evenly", backgroundColor: ground, borderRadius: 22, paddingTop: 8, paddingHorizontal: 6, minHeight: 78, overflow: "hidden" }}
      accessibilityLabel={t("decos.label", { list: ids.map((i) => ITEM_BY_ID[i]?.name).join(", ") })}>
      {ids.map((id) => {
        const a = ITEM_ART[`deco_${id}`];
        if (!a) return null;
        const h = 66, w = (a.w / a.h) * h;
        return <Image key={id} source={a.src} style={{ width: w, height: h, marginBottom: 4 }} />;
      })}
    </View>
  );
}
