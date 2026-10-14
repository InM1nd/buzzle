/**
 * v1.3 «Сюрпризы» tab: surprise combs, the weekly layer (chest for 15 tasks, weekend puzzle, streak freeze),
 * the collection album, the pollen shop, the visible odds, boosters / fragments / pocket seeds and the invite button.
 */
import { t, tx } from "../i18n";
import { BEE_BY_ID } from "../logic/bees";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  GameState, canBuyFreeze, canClaimWeekly, canAssembleNightBee, dailyStreak, FREEZE_COST, today, weekendOpen, WEEKLY_REWARD,
} from "../logic/game";
import {
  BONUS_GOLD, BOOSTERS, BOX_INFO, BOX_KINDS, BOX_ODDS, BoosterId, BoxKind, DUP_POLLEN, DUP_REROLL, FRAGMENTS_FOR_BEE, ITEM_BY_ID, ITEMS, KIND_ODDS, PITY_EPIC, PITY_LEGENDARY,
  NIGHT_BEE, PAGES, pageDone, RARITIES, SHOP_BOOSTER, SHOP_FRAGMENT, SHOP_PRICE,
} from "../logic/loot";
import { FLOWER_BY_ID } from "../logic/garden";
import { WEEKLY_TASKS } from "../logic/tasks";
import { WEEKEND_MOVES, WEEKEND_STARS, weekdayOf } from "../logic/day";
import { ART } from "../ui/art";
import { GARDEN_ART } from "../ui/beeArt";
import { C, shadow } from "../ui/theme";
import { Bar, Card, CloseBtn, fmt, GameButton, Overlay, Press, Stars, Txt } from "../ui/components";
import { BOOSTER_ART, boxArt, ItemIcon, RARITY_UI } from "../ui/lootUi";
import { centerOf, Pt } from "../ui/Fly";
import { days } from "../ui/format";

interface Props {
  s: GameState; now: number;
  onOpenBox: (kind: BoxKind) => void;
  onClaimWeekly: (from: Pt | null) => void;
  onBuyFreeze: () => boolean;
  onPlayWeekend: () => void;
  onAssemble: () => boolean;
  onBuyItem: (id: string) => boolean;
  onBuyBooster: (b: BoosterId) => boolean;
  onBuyFragment: () => boolean;
  onToggleDeco: (id: string) => void;
  onInvite?: () => void;
}
const kindName = (k: string) => tx(`ls.kind.${k}`);

export default function LootScreen(p: Props) {
  const { s, now } = p;
  const [sheet, setSheet] = useState<null | "album" | "shop" | { odds: BoxKind }>(null);
  const [seg, setSeg] = useState<"chests" | "shop" | "album">("chests");
  const owned = new Set([...s.loot.owned, ...(s.bees.includes(NIGHT_BEE) ? [NIGHT_BEE] : [])]);
  const total = PAGES.reduce((a, pg) => a + pg.items.filter(i => i !== "headphones").length, 0);
  const got = PAGES.reduce((a, pg) => a + pg.items.filter((i) => i !== "headphones" && owned.has(i)).length, 0);
  const [gridW, setGridW] = useState(328);
  const tileW = Math.max(1, Math.floor((gridW - 12) / 2) - 1);
  const chestRef = React.useRef<View | null>(null);
  const wkDay = weekdayOf(today(s, now));
  const weekend = weekendOpen(s, now);
  const streak = dailyStreak(s, now);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* v1.5: one tab, three sections */}
        <Txt v="h1" style={{ marginBottom: -4 }}>{t("tab.loot")}</Txt>
        <View style={styles.seg3} accessibilityRole="tablist">
          {(["chests", "shop", "album"] as const).map((k) => (
            <Press key={k} onPress={() => setSeg(k)} style={[styles.seg3Btn, seg === k && styles.seg3On]} scaleTo={0.96}
              accessibilityRole="tab" accessibilityLabel={t(`ls.seg.${k}`)} accessibilityState={{ selected: seg === k }}>
              <Txt v="h3" color={seg === k ? "#fff" : "#A07A4C"} numberOfLines={1}>{t(`ls.seg.${k}`)}</Txt>
            </Press>
          ))}
        </View>
        {seg === "chests" ? (<>
        {/* ready comb + rows */}
        {(() => {
          const ready = (BOX_KINDS as BoxKind[]).find((k) => k !== "royal" && s.loot.boxes[k] > 0) ?? null;
          const feat = ready ?? "wood";
          const od = BOX_ODDS[feat];
          const epicLeft = Math.max(0, 10 - s.loot.pity.sinceEpic);
          const legLeft = Math.max(0, 30 - s.loot.pity.sinceLeg);
          return (
            <>
              <Card style={{ alignItems: "center", paddingVertical: 16 }}>
                <Txt v="tiny" color={C.dim}>{ready ? t("ls.ready") : t("ls.sub")}</Txt>
                <Txt v="h1" center>{BOX_INFO[feat].name}</Txt>
                <Press onPress={() => (ready ? p.onOpenBox(feat) : setSheet({ odds: feat }))} accessibilityRole="button" accessibilityLabel={BOX_INFO[feat].name}>
                  <Image source={boxArt(feat)} style={{ width: 140, height: 140, marginVertical: 8, opacity: ready ? 1 : 0.7 }} />
                </Press>
                {ready ? <View style={styles.countBig}><Txt v="h2" color="#fff">×{s.loot.boxes[feat]}</Txt></View> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 10 }}>
                  {RARITIES.map((r, i) => (
                    <View key={r} style={[styles.chip, { backgroundColor: RARITY_UI[r].bg }]}>
                      <Txt v="tiny" color={RARITY_UI[r].color}>{RARITY_UI[r].name} {od.odds[i]}%</Txt>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <View style={styles.chip}><Txt v="tiny" color={C.dim}>{t("ls.pityEpic", { n: epicLeft })}</Txt></View>
                  <View style={styles.chip}><Txt v="tiny" color={C.dim}>{t("ls.pityLeg", { n: legLeft })}</Txt></View>
                </View>
                <GameButton title={ready ? t("ls.open") : t("ls.none")} color={ready ? "green" : "grey"} disabled={!ready}
                  onPress={() => ready && p.onOpenBox(feat)} label={t("ls.openLabel", { name: BOX_INFO[feat].name })} style={{ alignSelf: "stretch" }} />
              </Card>
              {BOX_KINDS.filter((k) => k !== feat).map((k) => {
                const n = s.loot.boxes[k]; const locked = k === "royal";
                const opened = s.loot.opened[k] ?? 0;
                return (
                  <Press key={k} onPress={() => (!locked && n > 0 ? p.onOpenBox(k) : setSheet({ odds: k }))} style={[styles.rowBox, shadow]}
                    accessibilityRole="button" accessibilityLabel={`${BOX_INFO[k].name}: ${locked ? t("ls.lockedSeasons") : n}`}>
                    <Image source={boxArt(k)} style={{ width: 56, height: 56, opacity: locked ? 0.5 : 1 }} />
                    <View style={{ flex: 1 }}>
                      <Txt v="h3">{BOX_INFO[k].name}{n > 0 ? ` · ${n}` : ""}</Txt>
                      <Txt v="tiny" color={C.dim}>{locked ? t("ls.inSeasons") : tx(`box.howShort.${k}`)}</Txt>
                      {!locked ? <Bar progress={Math.min(1, opened / 10)} height={6} color={C.honey} style={{ marginTop: 4 }} /> : null}
                    </View>
                    {locked ? <Image source={ART.lock} style={{ width: 22, height: 22 }} /> :
                      n > 0 ? <GameButton small title={t("ls.open")} color="green" onPress={() => p.onOpenBox(k)} label={t("ls.openLabel", { name: BOX_INFO[k].name })} /> :
                      <Txt v="tiny" color={C.dim}>{t("ls.none")}</Txt>}
                  </Press>
                );
              })}
              <Card>
                <Txt v="h3" style={{ marginBottom: 8 }}>{t("ls.stock")}</Txt>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(Object.keys(BOOSTERS) as BoosterId[]).map((b) => (
                    <View key={b} style={styles.inv} accessibilityLabel={`${BOOSTERS[b].name}: ${s.loot.boosters[b]}`}>
                      <Image source={BOOSTER_ART[b]} style={{ width: 36, height: 36 }} resizeMode="contain" />
                      <Txt v="h3">{s.loot.boosters[b]}</Txt>
                      <Txt v="tiny" color={C.dim} center numberOfLines={2}>{BOOSTERS[b].name}</Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          );
        })()}

        </>) : seg === "shop" ? (
          <View style={[styles.segPanel, shadow]}><Shop s={p.s} onBuyItem={p.onBuyItem} onBuyBooster={p.onBuyBooster} onBuyFragment={p.onBuyFragment} /></View>
        ) : (
          <View style={[styles.segPanel, shadow]}><Album s={s} onToggleDeco={p.onToggleDeco} onShop={() => setSeg("shop")} /></View>
        )}
      </ScrollView>

      <Overlay visible={!!sheet} onClose={() => setSheet(null)}>
        <CloseBtn onPress={() => setSheet(null)} />
        {sheet === "album" ? <Album s={s} onToggleDeco={p.onToggleDeco} onShop={() => setSheet("shop")} />
          : sheet === "shop" ? <Shop s={p.s} onBuyItem={p.onBuyItem} onBuyBooster={p.onBuyBooster} onBuyFragment={p.onBuyFragment} />
          : sheet ? <Odds kind={sheet.odds} s={s} /> : null}
      </Overlay>
    </View>
  );
}

function SheetScroll({ children }: { children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  return <ScrollView style={{ maxHeight: height * 0.72 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

// ---------------------------------------------------------------- album
function Album({ s, onToggleDeco, onShop }: { s: GameState; onToggleDeco: (id: string) => void; onShop: () => void }) {
  const owned = new Set(s.loot.owned);
  const visibleItems = ITEMS.filter((i) => i.id !== "headphones");
  const total = visibleItems.length;
  const have = visibleItems.filter((i) => owned.has(i.id)).length;
  return (
    <View accessibilityLabel={t("al.title")}>
      <Txt v="h2">{t("al.title")}</Txt>
      <Bar progress={have / Math.max(1, total)} height={10} color={C.honey} style={{ marginVertical: 8 }} />
      <Txt v="small" color={C.dim} style={{ marginBottom: 10 }}>{t("al.progress", { a: have, b: total })}</Txt>
      {PAGES.map((pg) => {
        const done = pageDone(owned, pg);
        const items = pg.items.filter((id) => id !== "headphones").map((id) => ITEM_BY_ID[id]).filter(Boolean);
        return (
          <Card key={pg.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Txt v="h3" style={{ flex: 1 }}>{pg.title}</Txt>
              {done ? <Image source={ART.check} style={{ width: 22, height: 22 }} /> : <Txt v="tiny" color={C.dim}>{items.filter((i) => owned.has(i.id)).length}/{items.length}</Txt>}
            </View>
            {pg.bonus ? <Txt v="tiny" color={C.honeyDark} style={{ marginBottom: 6 }}>{pg.bonus}</Txt> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {items.map((it) => {
                const has = owned.has(it.id);
                return (
                  <Press key={it.id} onPress={() => has && it.kind === "deco" ? onToggleDeco(it.id) : undefined}
                    style={[styles.alCell, !has && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={it.name}>
                    <ItemIcon id={it.id} size={44} locked={!has} />
                    <Txt v="tiny" numberOfLines={1} center>{has ? it.name : "???"}</Txt>
                  </Press>
                );
              })}
            </View>
          </Card>
        );
      })}
      <GameButton title={t("sh.label")} color="white" onPress={onShop} style={{ marginTop: 4 }} />
    </View>
  );
}

function Shop({ s, onBuyItem, onBuyBooster, onBuyFragment }: { s: GameState; onBuyItem: (id: string) => boolean; onBuyBooster: (b: BoosterId) => boolean; onBuyFragment: () => boolean }) {
  const missing = ITEMS.filter((i) => i.id !== "headphones" && !s.loot.owned.includes(i.id)).sort((a, b) => SHOP_PRICE[a.rarity] - SHOP_PRICE[b.rarity]);
  const [gridW, setGridW] = useState(328);
  const col = Math.max(1, Math.floor((gridW - 20) / 3));
  const Price = ({ n }: { n: number }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Image source={ART.pollen} style={{ width: 14, height: 14 }} /><Txt v="tiny">{n}</Txt></View>
  );
  return (
    <View accessibilityLabel={t("sh.label")}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Image source={ART.pollen} style={{ width: 40, height: 40 }} />
        <View style={{ flex: 1 }}>
          <Txt v="h2">{fmt(s.loot.pollen)}</Txt>
          <Txt v="small" color={C.dim}>{t("sh.forDups")}</Txt>
        </View>
      </Card>
      <Txt v="tiny" color={C.dim} style={{ marginBottom: 6 }}>{t("sh.items")}</Txt>
      <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {missing.length ? missing.map((it) => {
          const price = SHOP_PRICE[it.rarity]; const r = RARITY_UI[it.rarity];
          return (
            <Press key={it.id} onPress={() => onBuyItem(it.id)} disabled={s.loot.pollen < price}
              style={[styles.shopCard, shadow, { width: col }, s.loot.pollen < price && { opacity: 0.5 }]}
              accessibilityRole="button" accessibilityLabel={`${it.name}: ${price}`}>
              <ItemIcon id={it.id} size={48} />
              <Txt v="tiny" numberOfLines={2} center style={{ marginTop: 4, minHeight: 28 }}>{it.name}</Txt>
              <Txt v="tiny" color={r.color} center>{r.name}</Txt>
              <Price n={price} />
            </Press>
          );
        }) : <Txt v="small" color={C.greenDark}>{t("sh.allDone")}</Txt>}
      </View>
      <Txt v="tiny" color={C.dim} style={{ marginTop: 14, marginBottom: 6 }}>{t("sh.boostFrag")}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(Object.keys(BOOSTERS) as BoosterId[]).map((b) => (
          <Press key={b} onPress={() => onBuyBooster(b)} disabled={s.loot.pollen < SHOP_BOOSTER[b]}
            style={[styles.shopCard, shadow, { width: col }, s.loot.pollen < SHOP_BOOSTER[b] && { opacity: 0.5 }]}
            accessibilityRole="button" accessibilityLabel={`${BOOSTERS[b].name}: ${SHOP_BOOSTER[b]}`}>
            <Image source={BOOSTER_ART[b]} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <Txt v="tiny" numberOfLines={2} center style={{ marginTop: 4, minHeight: 28 }}>{b === "shuffle" ? t("sh.shuffleShort") : BOOSTERS[b].name}</Txt>
            <Price n={SHOP_BOOSTER[b]} />
          </Press>
        ))}
        {!s.bees.includes(NIGHT_BEE) ? (
          <Press onPress={onBuyFragment} disabled={s.loot.pollen < SHOP_FRAGMENT || s.loot.fragments >= FRAGMENTS_FOR_BEE}
            style={[styles.shopCard, shadow, { width: col }]} accessibilityRole="button" accessibilityLabel={t("sh.fragment")}>
            <Image source={ART.fragment} style={{ width: 40, height: 40 }} />
            <Txt v="tiny" center style={{ marginTop: 4 }}>{t("sh.fragment")}</Txt>
            <Txt v="tiny" color={C.dim}>{s.loot.fragments}/{FRAGMENTS_FOR_BEE}</Txt>
            <Price n={SHOP_FRAGMENT} />
          </Press>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- odds (visible in the game)
function Odds({ kind, s }: { kind: BoxKind; s: GameState }) {
  const od = BOX_ODDS[kind];
  const row = (label: string, odds: number[]) => (
    <View style={styles.oddsRow}>
      <Txt v="small" style={{ width: 92 }}>{label}</Txt>
      {RARITIES.map((r, i) => (
        <View key={r} style={[styles.oddsCell, { backgroundColor: RARITY_UI[r].bg }]}>
          <Txt v="small" color={RARITY_UI[r].color} center>{odds[i]}%</Txt>
        </View>
      ))}
    </View>
  );
  return (
    <View accessibilityLabel={t("ls.oddsLabel", { name: BOX_INFO[kind].name })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginRight: 40 }}>
        <Image source={boxArt(kind)} style={{ width: 56, height: 56 }} />
        <View style={{ flex: 1 }}><Txt v="h2">{BOX_INFO[kind].name}</Txt><Txt v="small" color={C.dim}>{BOX_INFO[kind].how}</Txt></View>
      </View>
      <SheetScroll>
        {kind === "royal" ? <Txt v="small" color={C.dim} style={{ marginTop: 8 }}>{t("od.royal")}</Txt> : null}
        <Txt v="tiny" color={C.dim} style={{ marginTop: 12 }}>{t("od.perSlot", { n: od.slots })}</Txt>
        <View style={styles.oddsRow}>
          <View style={{ width: 92 }} />
          {RARITIES.map((r) => <View key={r} style={styles.oddsCell}><Txt v="tiny" color={RARITY_UI[r].color} center numberOfLines={1}>{tx(`rarityShort.${r}`)}</Txt></View>)}
        </View>
        {od.first ? row(t("od.first"), od.first) : null}
        {row(od.first ? t("od.rest") : t("od.each"), od.odds)}
        <Txt v="small" color={C.dim} style={{ marginTop: 8 }}>
          {t("od.always", { extra: (kind === "wood" ? t("od.seeds") : "") + (kind === "wax" ? t("od.jelly50") : kind === "gold" || kind === "royal" ? t("od.jelly") : "") })}
          {BONUS_GOLD[kind] ? t("od.bonusGold", { n: BONUS_GOLD[kind] }) : ""}
        </Txt>
        {kind === "gold" ? (
          <View style={[styles.bonus, { marginTop: 10 }]}>
            <Txt v="h3" style={{ fontSize: 15 }}>{t("od.pity")}</Txt>
            <Txt v="small" color={C.dim}>{t("od.pityText", { a: PITY_EPIC, b: PITY_LEGENDARY })}</Txt>
            <Txt v="small" color={C.text} style={{ marginTop: 4 }}>{t("od.pityNow", { a: PITY_EPIC - s.loot.pity.sinceEpic, b: PITY_LEGENDARY - s.loot.pity.sinceLeg })}</Txt>
          </View>
        ) : null}
        <Txt v="tiny" color={C.dim} style={{ marginTop: 12 }}>{t("od.whatSlot")}</Txt>
        {RARITIES.map((r) => (
          <Txt key={r} v="small" color={C.dim} style={{ marginTop: 2 }}>
            <Txt v="small" color={RARITY_UI[r].color}>{RARITY_UI[r].name}: </Txt>
            {KIND_ODDS[r].map(([k, w]) => `${kindName(k)} ${w}%`).join(", ")}
          </Txt>
        ))}
        <Txt v="small" color={C.dim} style={{ marginTop: 10 }}>
          {t("od.dups", { reroll: DUP_REROLL ? t("od.reroll") : "", list: RARITIES.map((r) => `${RARITY_UI[r].name} ${DUP_POLLEN[r]}`).join(", ") })}
        </Txt>
      </SheetScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  countBig: { position: "absolute", top: 56, right: 24, backgroundColor: C.honeyDeep, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 2 },
  chip: { backgroundColor: "#F3E8D0", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  rowBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 20, padding: 12 },
  shopCard: { backgroundColor: "#fff", borderRadius: 18, padding: 10, alignItems: "center", gap: 2 },
  alCell: { width: "22%", alignItems: "center", gap: 2 },
  seg3: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 4, gap: 4, ...shadow },
  seg3Btn: { flex: 1, height: 38, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  seg3On: { backgroundColor: C.honey },
  segPanel: { backgroundColor: "#fff", borderRadius: 22, padding: 14 },
  tile: { backgroundColor: "#fff", borderRadius: 24, padding: 12, paddingTop: 10 },
  tileReady: { borderWidth: 2, borderColor: C.honey },
  info: { position: "absolute", right: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "#F6E7CB", alignItems: "center", justifyContent: "center", zIndex: 2 },
  count: { position: "absolute", right: -4, top: 2, minWidth: 30, height: 30, borderRadius: 15, backgroundColor: C.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderWidth: 2, borderColor: "#fff" },
  lock: { position: "absolute", left: "34%", top: "34%", width: 40, height: 40 },
  sep: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  weekendIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#EFE6FF", alignItems: "center", justifyContent: "center" },
  big: { flex: 1, backgroundColor: "#fff", borderRadius: 24, padding: 14, alignItems: "center" },
  inv: { flex: 1, alignItems: "center", backgroundColor: C.cardWarm, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 4 },
  seed: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.cardWarm, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5, borderColor: C.line },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 10 },
  tabChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#F6E7CB" },
  tabChipOn: { backgroundColor: C.jelly },
  bonus: { borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: "#fff", padding: 10 },
  albumGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" },
  albumCell: { width: 104, borderRadius: 18, borderWidth: 2.5, padding: 6, alignItems: "center" },
  toggle: { marginTop: 4, backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 8, marginBottom: 8, borderWidth: 1.5, borderColor: C.line },
  buy: { backgroundColor: "#FFF0C7", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: C.honey },
  oddsRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  oddsCell: { flex: 1, borderRadius: 8, paddingVertical: 4 },
});
