/** v1.3 shared bits for the surprise-comb screens: rarity colours (= pollen colours), item / drop icons and labels. */
import React from "react";
import { Image, View } from "react-native";
import { BoosterId, BOOSTERS, Drop, ITEM_BY_ID, Rarity, RARITY_NAME } from "../logic/loot";
import { FLOWER_BY_ID } from "../logic/garden";
import { ART } from "./art";
import { GARDEN_ART, ITEM_ART } from "./beeArt";
import { BeeSprite } from "./BeeSprite";
import { fmt } from "./components";

/** frame colours follow the pollen colours of the puzzle */
export const RARITY_UI: Record<Rarity, { color: string; bg: string; name: string }> = {
  common: { color: "#2FA864", bg: "#E4F7EA", name: RARITY_NAME.common },
  rare: { color: "#2E8BEA", bg: "#E1EEFC", name: RARITY_NAME.rare },
  epic: { color: "#8A5BE6", bg: "#EFE6FF", name: RARITY_NAME.epic },
  legendary: { color: "#E09A00", bg: "#FFF0C7", name: RARITY_NAME.legendary },
};
export const BOOSTER_ART: Record<BoosterId, number> = { moves: ART.boostMoves, bomb: ART.bomb, shuffle: ART.boostShuffle };
export const boxArt = (kind: string) => ITEM_ART[`box_${kind}`]?.src;

/** picture of a collectible (skin on Zhuzha, decoration, rare flower, night bee) */
export function ItemIcon({ id, size, locked }: { id: string; size: number; locked?: boolean }) {
  const it = ITEM_BY_ID[id];
  const tint = locked ? "#D8C29C" : undefined;
  if (!it) return <View style={{ width: size, height: size }} />;
  if (it.kind === "skin") return <BeeSprite id="zhuzha" size={size * 1.15} skin={locked ? undefined : id} tint={tint} flap={false} turn={0.35} style={{ margin: -size * 0.075 }} />;
  if (it.kind === "bee") return <BeeSprite id={id} size={size * 1.15} tint={tint} flap={false} turn={0.35} style={{ margin: -size * 0.075 }} />;
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
    case "honey": return `${fmt(d.n)} мёда`;
    case "nectar": return `${d.n} нектара`;
    case "jelly": return `${d.n} молочка`;
    case "seed": return `${FLOWER_BY_ID[d.flower]?.name ?? d.flower}${d.n > 1 ? ` ×${d.n}` : ""}`;
    case "item": return ITEM_BY_ID[d.id]?.name ?? d.id;
    case "booster": return `${BOOSTERS[d.b].name}${d.n > 1 ? ` ×${d.n}` : ""}`;
    case "fragment": return `${d.n} ${d.n === 1 ? "фрагмент" : d.n < 5 ? "фрагмента" : "фрагментов"}`;
    case "box": return "Золотая сота!";
  }
}
export function dropSub(d: Drop): string | null {
  if (d.t === "item") return d.dup ? `повтор → +${d.pollen} пыльцы` : "новое в альбоме!";
  if (d.t === "seed") return FLOWER_BY_ID[d.flower]?.rare ? "редкие семена" : "семена";
  if (d.t === "fragment") return d.pollen ? `→ +${d.pollen} пыльцы` : "Ночной пчелы";
  if (d.t === "booster") return "бустер";
  if (d.t === "box") return "внутри восковой";
  return null;
}
export const isResource = (d: Drop) => d.t === "honey" || d.t === "nectar" || d.t === "jelly";

/** v1.3: owned decorations standing by the hive / in the garden (toggled in the album). */
export function DecoStrip({ ids, ground }: { ids: string[]; ground: string }) {
  if (!ids.length) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-evenly", backgroundColor: ground, borderRadius: 22, paddingTop: 8, paddingHorizontal: 6, minHeight: 78 }}
      accessibilityLabel={`Украшения: ${ids.map((i) => ITEM_BY_ID[i]?.name).join(", ")}`}>
      {ids.map((id) => {
        const a = ITEM_ART[`deco_${id}`];
        if (!a) return null;
        const h = 66, w = (a.w / a.h) * h;
        return <Image key={id} source={a.src} style={{ width: w, height: h, marginBottom: 4 }} />;
      })}
    </View>
  );
}
