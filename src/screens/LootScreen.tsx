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
  BONUS_GOLD, BOOSTERS, BOX_INFO, BOX_KINDS, BOX_ODDS, BoosterId, BoxKind, DUP_POLLEN, DUP_REROLL, FRAGMENTS_FOR_BEE, ITEM_BY_ID, ITEMS,
  KIND_ODDS, NIGHT_BEE, PAGES, pageDone, PITY_EPIC, PITY_LEGENDARY, RARITIES, SHOP_BOOSTER, SHOP_FRAGMENT, SHOP_PRICE,
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
  onInvite: () => void;
}
const kindName = (k: string) => tx(`ls.kind.${k}`);

export default function LootScreen(p: Props) {
  const { s, now } = p;
  const { width } = useWindowDimensions();
  const [sheet, setSheet] = useState<null | "album" | "shop" | { odds: BoxKind }>(null);
  const owned = new Set([...s.loot.owned, ...(s.bees.includes(NIGHT_BEE) ? [NIGHT_BEE] : [])]);
  const total = PAGES.reduce((a, pg) => a + pg.items.length, 0);
  const got = PAGES.reduce((a, pg) => a + pg.items.filter((i) => owned.has(i)).length, 0);
  const tileW = (Math.min(width, 560) - 32 - 12) / 2;
  const chestRef = React.useRef<View | null>(null);
  const wkDay = weekdayOf(today(s, now));
  const weekend = weekendOpen(s, now);
  const streak = dailyStreak(s, now);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* combs */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Txt v="h1">{t("ls.title")}</Txt>
              <Txt v="small" color={C.dim}>{t("ls.sub")}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {BOX_KINDS.map((k) => {
              const n = s.loot.boxes[k];
              const locked = k === "royal";
              return (
                <View key={k} style={[styles.tile, shadow, { width: tileW }, n > 0 && !locked && styles.tileReady]}>
                  <Press onPress={() => setSheet({ odds: k })} style={styles.info} accessibilityRole="button" accessibilityLabel={t("ls.oddsLabel", { name: BOX_INFO[k].name })} scaleTo={0.85}>
                    <Txt v="h3" color={C.dim} style={{ fontSize: 15 }}>i</Txt>
                  </Press>
                  <Press onPress={() => (!locked && n > 0 ? p.onOpenBox(k) : setSheet({ odds: k }))} haptic={false} accessibilityRole="button"
                    accessibilityLabel={`${BOX_INFO[k].name}: ${locked ? t("ls.lockedSeasons") : n}`} style={{ alignItems: "center" }}>
                    <View>
                      <Image source={boxArt(k)} style={{ width: tileW * 0.62, height: tileW * 0.62, opacity: locked ? 0.55 : n > 0 ? 1 : 0.75 }} />
                      {locked ? <Image source={ART.lock} style={styles.lock} /> : n > 0 ? <View style={styles.count}><Txt v="h3" color="#fff">{n}</Txt></View> : null}
                    </View>
                    <Txt v="h3" center numberOfLines={1} style={{ fontSize: 15 }}>{BOX_INFO[k].name}</Txt>
                    <Txt v="tiny" color={C.dim} center numberOfLines={2} style={{ minHeight: 26 }}>{locked ? t("ls.inSeasons") : tx(`box.howShort.${k}`)}</Txt>
                  </Press>
                  {!locked ? (
                    <GameButton small title={n > 0 ? t("ls.open") : t("ls.none")} color={n > 0 ? "green" : "grey"} disabled={n <= 0} onPress={() => p.onOpenBox(k)} style={{ marginTop: 6 }} label={t("ls.openLabel", { name: BOX_INFO[k].name })} />
                  ) : <GameButton small title={t("ls.soon")} color="grey" disabled onPress={() => {}} style={{ marginTop: 6 }} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* weekly layer */}
        <Card>
          <Txt v="tiny" color={C.honeyDark}>{t("ls.weekCaps")}</Txt>
          <View ref={chestRef} collapsable={false} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
            <Image source={boxArt("wax")} style={{ width: 54, height: 54 }} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t("ls.weekChest")}</Txt>
              <Txt v="small" color={C.dim}>{t("ls.weekChestSub", { n: WEEKLY_TASKS, wax: WEEKLY_REWARD.wax, jelly: WEEKLY_REWARD.jelly })}</Txt>
              <Bar progress={Math.min(1, s.week.tasks / WEEKLY_TASKS)} height={10} style={{ marginTop: 6 }} color={C.green} />
              <Txt v="tiny" color={C.dim} style={{ marginTop: 2 }}>{s.week.chest ? t("ls.weekGot") : t("ls.weekProgress", { a: Math.min(s.week.tasks, WEEKLY_TASKS), b: WEEKLY_TASKS, d: days(7 - wkDay) })}</Txt>
            </View>
          </View>
          {canClaimWeekly(s) ? <GameButton title={t("ls.claimChest")} color="green" style={{ marginTop: 10 }} onPress={async () => p.onClaimWeekly(await centerOf(chestRef.current))} /> : null}

          <View style={styles.sep} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.weekendIcon}><Image source={ART.cells[2]} style={{ width: 40, height: 35 }} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t("ls.weekendTitle")}</Txt>
              <Txt v="small" color={C.dim}>{t("ls.weekendSub", { n: WEEKEND_MOVES })}</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Stars n={s.week.weekendStars} size={20} />
                <Txt v="tiny" color={C.dim}>{WEEKEND_STARS.map(fmt).join(" · ")}{s.week.weekendBest ? t("ls.weekendBest", { n: fmt(s.week.weekendBest) }) : ""}</Txt>
              </View>
            </View>
          </View>
          <GameButton title={weekend ? (s.week.weekendStars === 3 ? t("ls.replay") : t("ls.play")) : t("ls.opensSat")} color={weekend ? "purple" : "grey"} disabled={!weekend}
            sub={weekend ? t("ls.fair") : t("ls.inDays", { d: days(5 - wkDay) })} style={{ marginTop: 10 }} onPress={p.onPlayWeekend} label={t("ls.weekendTitle")} />

          <View style={styles.sep} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={ART.freeze} style={{ width: 46, height: 46 }} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t("ls.freeze")}</Txt>
              <Txt v="small" color={C.dim}>{t("ls.freezeSub")}</Txt>
              <Txt v="tiny" color={s.daily.freeze ? C.greenDark : C.dim} style={{ marginTop: 2 }}>
                {s.daily.freeze ? t("ls.freezeStock", { n: streak }) : s.week.freezeBought ? t("ls.freezeBought") : t("ls.freezeStreak", { n: streak })}
              </Txt>
            </View>
          </View>
          {!s.daily.freeze && !s.week.freezeBought ? (
            <GameButton small title={t("ls.buyFor", { n: FREEZE_COST })} icon={ART.jelly} color={canBuyFreeze(s) ? "honey" : "grey"} disabled={!canBuyFreeze(s)} onPress={p.onBuyFreeze} style={{ marginTop: 10 }} label={t("ls.buyFreezeLabel", { n: FREEZE_COST })} />
          ) : null}
        </Card>

        {/* collection */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Press onPress={() => setSheet("album")} style={[styles.big, shadow]} accessibilityRole="button" accessibilityLabel={t("ls.albumLabel", { a: got, b: total })}>
            <Image source={ART.album} style={{ width: 46, height: 46 }} />
            <Txt v="h3">{t("ls.album")}</Txt>
            <Txt v="small" color={C.dim}>{t("ls.aOfB", { a: got, b: total })}</Txt>
            <Bar progress={got / total} height={8} style={{ alignSelf: "stretch", marginTop: 6 }} color={C.jelly} />
          </Press>
          <Press onPress={() => setSheet("shop")} style={[styles.big, shadow]} accessibilityRole="button" accessibilityLabel={t("ls.shopLabel", { n: s.loot.pollen })}>
            <Image source={ART.shop} style={{ width: 46, height: 46 }} />
            <Txt v="h3">{t("ls.shop")}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Image source={ART.pollen} style={{ width: 18, height: 18 }} />
              <Txt v="small" color={C.dim}>{t("ls.pollenN", { n: fmt(s.loot.pollen) })}</Txt>
            </View>
          </Press>
        </View>

        {/* inventory */}
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
          <Txt v="tiny" color={C.dim} style={{ marginTop: 6 }}>{t("ls.boostHint")}</Txt>
          {!s.bees.includes(NIGHT_BEE) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
              <Image source={ART.fragment} style={{ width: 40, height: 40 }} />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{BEE_BY_ID.nochka.name}</Txt>
                <Bar progress={s.loot.fragments / FRAGMENTS_FOR_BEE} height={10} color="#5B5FC7" style={{ marginTop: 4 }} />
                <Txt v="tiny" color={C.dim}>{t("ls.fragments", { a: s.loot.fragments, b: FRAGMENTS_FOR_BEE })}</Txt>
              </View>
              {canAssembleNightBee(s) ? <GameButton small title={t("ls.assemble")} color="purple" onPress={p.onAssemble} /> : null}
            </View>
          ) : null}
          {Object.keys(s.loot.seeds).length ? (
            <View style={{ marginTop: 12 }}>
              <Txt v="small" color={C.dim}>{t("ls.pocketSeeds")}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {Object.entries(s.loot.seeds).map(([f, n]) => (
                  <View key={f} style={[styles.seed, FLOWER_BY_ID[f]?.rare && { borderColor: RARITY_UI.rare.color }]}>
                    <Image source={GARDEN_ART[`${f}_bloom`]} style={{ width: 26, height: 26 }} />
                    <Txt v="small">{FLOWER_BY_ID[f]?.name ?? f} ×{n}</Txt>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Card>

        <GameButton title={t("ls.invite")} icon={ART.share} color="white" onPress={p.onInvite} label={t("ls.invite")} />
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
  const [page, setPage] = useState(0);
  const owned = new Set([...s.loot.owned, ...(s.bees.includes(NIGHT_BEE) ? [NIGHT_BEE] : [])]);
  const pg = PAGES[page];
  const done = pageDone(owned, pg);
  const n = pg.items.filter((i) => owned.has(i)).length;
  return (
    <View accessibilityLabel={t("al.title")}>
      <Txt v="h2" style={{ marginRight: 40 }}>{t("al.title")}</Txt>
      <View style={styles.tabs}>
        {PAGES.map((x, i) => {
          const d = pageDone(owned, x);
          return (
            <Press key={x.id} onPress={() => setPage(i)} style={[styles.tabChip, i === page && styles.tabChipOn]} scaleTo={0.94} accessibilityRole="tab" accessibilityState={{ selected: i === page }} accessibilityLabel={x.title}>
              <Txt v="tiny" color={i === page ? "#fff" : C.dim}>{x.title.toUpperCase()}{d ? " ✓" : ""}</Txt>
            </Press>
          );
        })}
      </View>
      <SheetScroll>
        <View style={[styles.bonus, done && { backgroundColor: "#E4F7EA", borderColor: C.green }]}>
          <Txt v="small" color={done ? C.greenDark : C.dim}>{done ? t("al.done") : t("al.todo")}<Txt v="small" color={done ? C.greenDark : C.text}>{pg.bonus}</Txt></Txt>
          <Bar progress={n / pg.items.length} height={8} style={{ marginTop: 6 }} color={done ? C.green : C.jelly} />
          <Txt v="tiny" color={C.dim}>{n}/{pg.items.length}</Txt>
        </View>
        <View style={styles.albumGrid}>
          {pg.items.map((id) => {
            const it = ITEM_BY_ID[id]; const has = owned.has(id); const r = RARITY_UI[it.rarity];
            const hidden = s.loot.hidden.includes(id);
            return (
              <View key={id} style={[styles.albumCell, { borderColor: has ? r.color : "#E8D6B6", backgroundColor: has ? r.bg : "#FBF3E4" }]} accessibilityLabel={`${has ? it.name : t("al.missing")}, ${r.name}`}>
                <ItemIcon id={id} size={62} locked={!has} />
                <Txt v="small" center numberOfLines={1} style={{ marginTop: 2 }}>{has ? it.name : "???"}</Txt>
                <Txt v="tiny" color={r.color} center>{r.name.toUpperCase()}</Txt>
                {has && it.kind === "deco" ? (
                  <Press onPress={() => onToggleDeco(id)} style={[styles.toggle, hidden && { backgroundColor: "#EADBC2" }]} accessibilityRole="button" accessibilityLabel={hidden ? t("al.place", { name: it.name }) : t("al.remove", { name: it.name })}>
                    <Txt v="tiny" color={hidden ? C.dim : "#fff"}>{hidden ? t("al.placeCaps") : it.place === "hive" ? t("al.atHive") : t("al.inGarden")}</Txt>
                  </Press>
                ) : !has ? <Txt v="tiny" color={C.faint} center numberOfLines={2}>{it.kind === "bee" ? t("al.frag", { a: s.loot.fragments, b: FRAGMENTS_FOR_BEE }) : it.kind === "flower" ? t("al.seedsFromCombs") : t("al.shopPrice", { n: SHOP_PRICE[it.rarity] })}</Txt> : null}
              </View>
            );
          })}
        </View>
        <Txt v="small" color={C.dim} style={{ marginTop: 10 }}>{t("al.hint")}</Txt>
        <GameButton small title={t("al.toShop")} color="white" icon={ART.shop} onPress={onShop} style={{ marginTop: 10 }} />
      </SheetScroll>
    </View>
  );
}

// ---------------------------------------------------------------- shop
function Shop({ s, onBuyItem, onBuyBooster, onBuyFragment }: { s: GameState; onBuyItem: (id: string) => boolean; onBuyBooster: (b: BoosterId) => boolean; onBuyFragment: () => boolean }) {
  const missing = ITEMS.filter((i) => !s.loot.owned.includes(i.id)).sort((a, b) => SHOP_PRICE[a.rarity] - SHOP_PRICE[b.rarity]);
  const Price = ({ n }: { n: number }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Image source={ART.pollen} style={{ width: 16, height: 16 }} /><Txt v="h3" style={{ fontSize: 14 }}>{n}</Txt></View>
  );
  return (
    <View accessibilityLabel={t("sh.label")}>
      <Txt v="h2" style={{ marginRight: 40 }}>{t("sh.label")}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Image source={ART.pollen} style={{ width: 24, height: 24 }} />
        <Txt v="h3">{fmt(s.loot.pollen)}</Txt>
        <Txt v="small" color={C.dim}>{t("sh.forDups")}</Txt>
      </View>
      <SheetScroll>
        <Txt v="tiny" color={C.dim} style={{ marginTop: 12, marginBottom: 6 }}>{t("sh.items")}</Txt>
        {missing.length ? missing.map((it) => {
          const price = SHOP_PRICE[it.rarity]; const r = RARITY_UI[it.rarity];
          return (
            <View key={it.id} style={[styles.shopRow, { borderColor: r.color }]}>
              <ItemIcon id={it.id} size={44} />
              <View style={{ flex: 1 }}>
                <Txt v="h3" style={{ fontSize: 15 }}>{it.name}</Txt>
                <Txt v="tiny" color={r.color}>{r.name.toUpperCase()} · {it.kind === "skin" ? t("sh.outfit") : it.place === "hive" ? t("sh.atHive") : t("sh.inGarden")}</Txt>
              </View>
              <Press onPress={() => onBuyItem(it.id)} disabled={s.loot.pollen < price} style={[styles.buy, s.loot.pollen < price && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={t("sh.buyLabel", { name: it.name, n: price })}>
                <Price n={price} />
              </Press>
            </View>
          );
        }) : <Txt v="small" color={C.greenDark}>{t("sh.allDone")}</Txt>}
        <Txt v="tiny" color={C.dim} style={{ marginTop: 12, marginBottom: 6 }}>{t("sh.boostFrag")}</Txt>
        {(Object.keys(BOOSTERS) as BoosterId[]).map((b) => (
          <View key={b} style={styles.shopRow}>
            <Image source={BOOSTER_ART[b]} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <View style={{ flex: 1 }}><Txt v="h3" style={{ fontSize: 15 }}>{BOOSTERS[b].name}</Txt><Txt v="tiny" color={C.dim}>{BOOSTERS[b].desc}</Txt></View>
            <Press onPress={() => onBuyBooster(b)} disabled={s.loot.pollen < SHOP_BOOSTER[b]} style={[styles.buy, s.loot.pollen < SHOP_BOOSTER[b] && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={t("sh.buyLabel", { name: BOOSTERS[b].name, n: SHOP_BOOSTER[b] })}><Price n={SHOP_BOOSTER[b]} /></Press>
          </View>
        ))}
        {!s.bees.includes(NIGHT_BEE) ? (
          <View style={styles.shopRow}>
            <Image source={ART.fragment} style={{ width: 40, height: 40 }} />
            <View style={{ flex: 1 }}><Txt v="h3" style={{ fontSize: 15 }}>{t("sh.fragment")}</Txt><Txt v="tiny" color={C.dim}>{s.loot.fragments}/{FRAGMENTS_FOR_BEE}</Txt></View>
            <Press onPress={onBuyFragment} disabled={s.loot.pollen < SHOP_FRAGMENT || s.loot.fragments >= FRAGMENTS_FOR_BEE} style={[styles.buy, (s.loot.pollen < SHOP_FRAGMENT || s.loot.fragments >= FRAGMENTS_FOR_BEE) && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={t("sh.buyFrag", { n: SHOP_FRAGMENT })}><Price n={SHOP_FRAGMENT} /></Press>
          </View>
        ) : null}
      </SheetScroll>
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
