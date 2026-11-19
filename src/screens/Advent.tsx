/** 1.7 winter: the advent calendar (card on the Tasks tab + the 24-window sheet) and the winter shop block. */
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { t, tx } from "../i18n";
import {
  adventOpenWay, adventVisible, GameState, nyView, rewardReady, today, winterBeeHome, winterView,
} from "../logic/game";
import { BeeSprite } from "../ui/BeeSprite";
import { BOOSTERS, BoosterId, BOX_INFO } from "../logic/loot";
import { FLOWER_BY_ID } from "../logic/garden";
import type { Reward } from "../logic/tasks";
import { ADVENT, ADVENT_DAYS, ADVENT_POLLEN, adventWindow, FLAKES_PER_FRAGMENT, NY_TRACK, WINTER_FLOWERS, WINTER_FRAGMENTS, WSHOP } from "../logic/winter";
import { GARDEN_ART } from "../ui/beeArt";
import { weekOf } from "../logic/day";
import { ART } from "../ui/art";
import { Bar, Bobbing, Card, CloseBtn, GameButton, Overlay, Press, Txt } from "../ui/components";
import { BOOSTER_ART, boxArt, ItemIcon } from "../ui/lootUi";
import { C, F, K, themed } from "../ui/theme";

const BULBS = ["#E8463C", "#F5B82E", "#3FA65B", "#3D8BE0"];

/** the garland: one bulb per window, lit when opened */
function Garland({ opened, size = 9 }: { opened: number[]; size?: number }) {
  return (
    <View style={styles.garland} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: ADVENT_DAYS }, (_, i) => {
        const on = opened.includes(i + 1);
        return <View key={i} style={{ width: size, height: size, borderRadius: size / 2, marginTop: i % 2 ? 4 : 0, backgroundColor: on ? BULBS[i % 4] : K.bg("#E6DCC8"), opacity: on ? 1 : 0.8 }} />;
      })}
    </View>
  );
}

/** snowflakes and the winter-bee fragments (sheet header and the shop) */
function WinterProgress({ s, now }: { s: GameState; now: number }) {
  const w = winterView(s, now);
  if (!w) return null;
  const left = FLAKES_PER_FRAGMENT - (w.flakes % FLAKES_PER_FRAGMENT);
  return (
    <View style={styles.winterRow}>
      <View style={styles.flakes} accessibilityLabel={`${t("win.flakes")}: ${w.flakes}`}>
        <Image source={ART.flake} style={{ width: 26, height: 22 }} resizeMode="contain" />
        <Txt v="h3">{w.flakes}</Txt>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Image source={ART.winterFragment} style={{ width: 18, height: 18 }} />
          <Txt v="tiny" style={F.black} numberOfLines={1}>{t("win.bee", { n: w.frags })}</Txt>
        </View>
        <Bar progress={w.frags / WINTER_FRAGMENTS} height={7} color="#7DB9E8" style={{ marginTop: 4 }} />
        {!winterBeeHome(s) && w.frags < WINTER_FRAGMENTS ? <Txt v="tiny" color={C.dim} numberOfLines={1} style={{ marginTop: 2 }}>{t("win.nextFrag", { n: left })}</Txt> : null}
      </View>
    </View>
  );
}

/** what a gift holds, as icon rows (items drawn like the album) */
function GiftLines({ r }: { r: Reward }) {
  const rows: { icon: React.ReactNode; text: string }[] = [];
  const img = (src: number) => <Image source={src} style={{ width: 40, height: 40 }} resizeMode="contain" />;
  for (const id of r.items ?? []) rows.push({ icon: <ItemIcon id={id} size={40} />, text: tx(`item.${id}`) });
  for (const k of r.boxes ?? []) rows.push({ icon: img(boxArt(k)), text: BOX_INFO[k].name });
  if (r.frags) rows.push({ icon: img(ART.winterFragment), text: `${t("win.frag")} ×${r.frags}` });
  for (const [f, n] of Object.entries(r.seeds ?? {})) rows.push({ icon: img(ART.seed), text: `${FLOWER_BY_ID[f]?.name ?? f} ×${n}` });
  for (const [b, n] of Object.entries(r.boosters ?? {}) as [BoosterId, number][]) rows.push({ icon: img(BOOSTER_ART[b]), text: `${BOOSTERS[b].name} ×${n}` });
  if (r.jelly) rows.push({ icon: img(ART.jelly), text: `+${r.jelly}` });
  if (r.pollen) rows.push({ icon: img(ART.pollen), text: `+${r.pollen}` });
  return (
    <View style={{ gap: 8, alignSelf: "stretch" }}>
      {rows.map((x, i) => (
        <View key={i} style={styles.giftRow}>{x.icon}<Txt v="h3" style={{ flex: 1 }} numberOfLines={2}>{x.text}</Txt></View>
      ))}
    </View>
  );
}

/** Tasks tab card (December): the garland and today's window */
export function AdventCard({ s, now, onOpen }: { s: GameState; now: number; onOpen: () => void }) {
  const w = winterView(s, now);
  if (!w || !adventVisible(s, now)) return null;
  const day = today(s, now);
  const dec = Math.min(ADVENT_DAYS, new Date(day * 86400000).getUTCDate());
  const todayOpen = w.advent.includes(dec);
  const missed = Array.from({ length: dec }, (_, i) => i + 1).filter((n) => adventWindow(w, n, day) === "catchup").length;
  const line = w.advent.length >= ADVENT_DAYS ? t("adv.allOpen")
    : !todayOpen && adventWindow(w, dec, day) === "today" ? t("adv.sub")
    : missed ? t("adv.catchUpLeft", { n: missed }) : dec < ADVENT_DAYS ? t("adv.doneToday", { n: dec + 1 }) : t("adv.sub");
  const due = adventWindow(w, dec, day) === "today";
  return (
    <Card active={due} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {due ? <Bobbing amp={3}><Image source={ART.adventClosed} style={styles.cardArt} resizeMode="contain" /></Bobbing>
          : <Image source={ART.adventOpen} style={styles.cardArt} resizeMode="contain" />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="h2" numberOfLines={1}>{t("adv.title")}</Txt>
          <Txt v="tiny" color={C.dim} numberOfLines={2}>{line}</Txt>
        </View>
        <Txt v="h3" color={C.honeyDark}>{t("adv.count", { n: w.advent.length })}</Txt>
      </View>
      <Garland opened={w.advent} />
      <GameButton small title={due ? t("adv.openToday", { n: dec }) : t("adv.show")} color={due ? "green" : "white"} onPress={onOpen}
        label={t("adv.label", { n: w.advent.length })} />
    </Card>
  );
}

type Panel = { kind: "got"; n: number; r: Reward } | { kind: "catchup" | "future" | "soon"; n: number } | null;

/** the 24 windows; opening goes through onWindow (App commits the state) */
export function AdventSheet({ visible, s, now, onClose, onWindow, onPlay }: {
  visible: boolean; s: GameState; now: number; onClose: () => void; onWindow: (n: number) => Reward | null; onPlay: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const w = winterView(s, now);
  if (!w) return null;
  const day = today(s, now);
  const open = (n: number) => { const r = onWindow(n); if (r) setPanel({ kind: "got", n, r }); };
  const tap = (n: number) => {
    const st = adventWindow(w, n, day);
    if (st === "open" || st === "closed") return;
    if (st === "future") return setPanel({ kind: "future", n });
    if (!rewardReady(ADVENT[n - 1])) return setPanel({ kind: "soon", n });
    if (st === "today") return open(n);
    setPanel({ kind: "catchup", n });
  };
  const close = () => { setPanel(null); onClose(); };
  return (
    <Overlay visible={visible} onClose={close}>
      <CloseBtn onPress={close} />
      <Txt v="h2" style={{ paddingRight: 44 }}>{t("adv.title")}</Txt>
      <Txt v="tiny" color={C.dim} style={{ marginBottom: 8, paddingRight: 44 }}>{t("adv.count", { n: w.advent.length })}</Txt>
      <Garland opened={w.advent} size={8} />
      <WinterProgress s={s} now={now} />
      {panel ? (
        <View style={styles.panel}>
          <Txt v="h2" center>{t("adv.got", { n: panel.n })}</Txt>
          {panel.kind === "got" ? (<>
            <Image source={ART.adventOpen} style={{ width: 84, height: 96, alignSelf: "center", marginVertical: 8 }} resizeMode="contain" />
            <GiftLines r={panel.r} />
            <GameButton title={t("adv.yay")} color="green" style={{ marginTop: 14, alignSelf: "stretch" }} onPress={() => setPanel(null)} label={t("adv.yay")} />
          </>) : panel.kind === "catchup" ? (() => {
            const way = adventOpenWay(s, panel.n, now);
            return (<>
              <Txt v="small" color={C.dim} center style={{ marginVertical: 10 }}>{t("adv.catchUp", { n: ADVENT_POLLEN })}</Txt>
              {way === "credit" ? <GameButton title={t("adv.byRound")} color="green" style={{ alignSelf: "stretch" }} onPress={() => open(panel.n)} label={t("adv.byRound")} /> : (<>
                <GameButton title={t("adv.byPollen", { n: ADVENT_POLLEN })} icon={ART.pollen} color={way === "pollen" ? "green" : "white"} disabled={way !== "pollen"}
                  style={{ alignSelf: "stretch" }} onPress={() => open(panel.n)} label={t("adv.byPollen", { n: ADVENT_POLLEN })} />
                <GameButton title={t("adv.playFirst")} color="honey" style={{ marginTop: 8, alignSelf: "stretch" }} onPress={() => { close(); onPlay(); }} label={t("adv.playFirst")} />
              </>)}
              <Press onPress={() => setPanel(null)} style={{ alignSelf: "center", padding: 10 }} accessibilityRole="button" accessibilityLabel={t("c.back")}>
                <Txt v="small" color={C.dim}>{t("c.back")}</Txt>
              </Press>
            </>);
          })() : (<>
            <Txt v="small" color={C.dim} center style={{ marginVertical: 10 }}>{panel.kind === "future" ? t("adv.future", { n: panel.n }) : t("adv.soon")}</Txt>
            <GameButton title={t("c.back")} color="white" style={{ alignSelf: "stretch" }} onPress={() => setPanel(null)} label={t("c.back")} />
          </>)}
        </View>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: ADVENT_DAYS }, (_, i) => {
            const n = i + 1, st = adventWindow(w, n, day);
            const art = st === "open" ? ART.adventOpen : ART.adventClosed;
            const cell = (
              <Press key={n} onPress={() => tap(n)} scaleTo={0.92} style={[styles.win, st === "today" && styles.winToday]}
                accessibilityRole="button" accessibilityLabel={t("adv.window", { n })} accessibilityState={{ disabled: st === "open" || st === "closed" }}>
                <Image source={art} style={{ width: 52, height: 58, opacity: st === "future" || st === "closed" ? 0.4 : st === "catchup" ? 0.8 : st === "open" ? 0.6 : 1 }} resizeMode="contain" />
                {st === "open" ? <Image source={ART.check} style={styles.check} /> : null}
                <View style={[styles.num, st === "today" && styles.numToday, st === "open" && styles.numOpen]}>
                  <Txt v="tiny" color={st === "today" ? "#fff" : C.text} style={[F.black, { fontSize: 11, lineHeight: 14 }]}>{n}</Txt>
                </View>
              </Press>
            );
            return st === "today" ? <Bobbing key={n} amp={3}>{cell}</Bobbing> : cell;
          })}
        </View>
      )}
    </Overlay>
  );
}

/** one reward as a small picture + a short line (track rows) */
function RewardMini({ r }: { r: Reward }) {
  if (r.bee) return (<View style={styles.mini}><BeeSprite id={r.bee} size={44} flap={false} /><Txt v="small" style={F.black} numberOfLines={1}>{tx(`bee.${r.bee}.name`)}</Txt></View>);
  const img = (r.boxes?.length ? boxArt(r.boxes[0]) : r.seeds ? ART.seed : r.boosters ? BOOSTER_ART[Object.keys(r.boosters)[0] as BoosterId] : r.pollen ? ART.pollen : ART.jelly);
  const text = r.boxes?.length ? `${BOX_INFO[r.boxes[0]].name}${r.boxes.length > 1 ? ` ×${r.boxes.length}` : ""}`
    : r.seeds ? Object.entries(r.seeds).map(([f, n]) => `${FLOWER_BY_ID[f]?.name ?? f} ×${n}`).join(", ")
    : r.boosters ? (Object.entries(r.boosters) as [BoosterId, number][]).map(([b, n]) => `${BOOSTERS[b].name} ×${n}`).join(", ")
    : r.pollen ? `+${r.pollen}` : `+${r.jelly ?? 0}`;
  return (<View style={styles.mini}><Image source={img} style={{ width: 36, height: 36 }} resizeMode="contain" /><Txt v="small" style={F.black} numberOfLines={2}>{text}</Txt></View>);
}

/** Tasks tab card (25 Dec – 10 Jan): the New Year track */
export function NyCard({ s, now, onClaim }: { s: GameState; now: number; onClaim: () => void }) {
  const [open, setOpen] = useState(false);
  const v = nyView(s, now);
  if (!v) return null;
  const next = NY_TRACK[v.w.nyClaimed];
  const prevAt = v.w.nyClaimed > 0 ? NY_TRACK[v.w.nyClaimed - 1].at : 0;
  const progress = next ? Math.min(1, (v.points - prevAt) / (next.at - prevAt)) : 1;
  return (
    <Card active={v.claimable > 0} style={{ gap: 8, borderWidth: 2, borderColor: "#BFE0F7" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BeeSprite id="gingerbee" size={56} flap={false} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="h2" numberOfLines={1}>{t("ny.title")}</Txt>
          <Txt v="tiny" color={C.dim} numberOfLines={2}>{v.running ? t("ny.sub") : t("ny.ended")}</Txt>
        </View>
        <View style={styles.flakes}><Image source={ART.flake} style={{ width: 24, height: 20 }} resizeMode="contain" /><Txt v="h3">{v.points}</Txt></View>
      </View>
      <Bar progress={progress} height={9} color="#7DB9E8" />
      <Txt v="tiny" color={v.claimable ? C.greenDark : C.dim}>{v.claimable ? t("ny.ready") : next ? t("ny.next", { n: next.at - v.points }) : t("ny.done")}</Txt>
      <GameButton small title={v.claimable ? t("ny.claimN", { n: v.claimable }) : t("ny.open")} color={v.claimable ? "green" : "white"}
        onPress={() => (v.claimable ? onClaim() : setOpen(true))} label={t("ny.title")} />
      <Overlay visible={open} onClose={() => setOpen(false)}>
        <CloseBtn onPress={() => setOpen(false)} />
        <Txt v="h2" style={{ paddingRight: 44 }}>{t("ny.title")}</Txt>
        {v.w.advent.length >= ADVENT_DAYS ? <Txt v="tiny" color={C.greenDark} style={{ marginTop: 2 }}>{t("ny.advent")}</Txt> : null}
        <View style={{ gap: 6, marginTop: 10 }}>
          {NY_TRACK.map((st, i) => {
            const done = i < v.w.nyClaimed, reached = v.points >= st.at;
            return (
              <View key={i} style={[styles.step, done && { opacity: 0.55 }, reached && !done && styles.stepReady]}>
                <View style={styles.stepAt}><Image source={ART.flake} style={{ width: 16, height: 14 }} resizeMode="contain" /><Txt v="tiny" style={F.black}>{st.at}</Txt></View>
                <View style={{ flex: 1, minWidth: 0 }}><RewardMini r={st.reward} /></View>
                {done ? <Image source={ART.check} style={{ width: 22, height: 22 }} /> : reached ? <Txt v="tiny" color={C.greenDark} style={F.black}>✓</Txt> : null}
              </View>
            );
          })}
        </View>
      </Overlay>
    </Card>
  );
}

export type WinterBuy = "fragPollen" | "fragJelly" | "wax" | "gold" | `seed:${string}`;
/** the winter block at the top of the shop (1 Dec – 28 Feb) */
export function WinterShop({ s, now, onBuy }: { s: GameState; now: number; onBuy: (what: WinterBuy) => boolean }) {
  const w = winterView(s, now);
  if (!w) return null;
  const day = today(s, now);
  const fragsDone = winterBeeHome(s) || w.frags >= WINTER_FRAGMENTS;
  const CUR = [ART.pollen, ART.jelly, ART.nectar];
  const Row = ({ icon, title, price, cur, ok, what, done }: { icon: number; title: string; price: number; cur: number; ok: boolean; what: WinterBuy; done?: string }) => (
    <View style={styles.shopRow}>
      <Image source={icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
      <Txt v="small" style={[F.black, { flex: 1 }]} numberOfLines={2}>{title}</Txt>
      {done ? <Txt v="tiny" color={C.green} style={F.black}>{done}</Txt> : (
        <GameButton small title={`${price}`} icon={CUR[cur]} color={ok ? "green" : "white"} disabled={!ok}
          onPress={() => onBuy(what)} label={`${title}: ${price}`} style={{ minWidth: 0, width: 72 }} />
      )}
    </View>
  );
  return (
    <Card style={{ marginBottom: 10, gap: 8, borderWidth: 2, borderColor: "#BFE0F7" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image source={ART.flake} style={{ width: 30, height: 26 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{t("wsh.title")}</Txt>
          <Txt v="tiny" color={C.dim}>{t("wsh.sub")}</Txt>
        </View>
      </View>
      <WinterProgress s={s} now={now} />
      <Row icon={ART.winterFragment} title={t("win.frag")} price={WSHOP.fragPollen} cur={0} ok={!fragsDone && s.loot.pollen >= WSHOP.fragPollen} what="fragPollen" done={fragsDone ? t("wsh.full") : undefined} />
      {!fragsDone ? <Row icon={ART.winterFragment} title={t("win.frag")} price={WSHOP.fragJelly} cur={1} ok={s.jelly >= WSHOP.fragJelly} what="fragJelly" /> : null}
      <Row icon={boxArt("wax")} title={t("wsh.wax")} price={WSHOP.waxJelly} cur={1} ok={s.jelly >= WSHOP.waxJelly && w.waxDay !== day} what="wax" done={w.waxDay === day ? t("wsh.bought") : undefined} />
      {WINTER_FLOWERS.map((f) => (
        <Row key={f} icon={GARDEN_ART[`${f}_bloom`]} title={t("wsh.seed", { name: FLOWER_BY_ID[f].name })} price={WSHOP.seedNectar} cur={2} ok={s.nectar >= WSHOP.seedNectar} what={`seed:${f}`} />
      ))}
      <Row icon={boxArt("gold")} title={t("wsh.gold")} price={WSHOP.goldJelly} cur={1} ok={s.jelly >= WSHOP.goldJelly && w.goldWeek !== weekOf(day)} what="gold" done={w.goldWeek === weekOf(day) ? t("wsh.bought") : undefined} />
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  garland: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, marginVertical: 4 },
  cardArt: { width: 52, height: 58 },
  winterRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8, padding: 8, borderRadius: 14, backgroundColor: K.bg("#EEF6FC") },
  flakes: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: K.bg("#fff") },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 },
  win: { width: 64, height: 70, alignItems: "center", justifyContent: "center" },
  winToday: { borderRadius: 18, backgroundColor: K.bg("#FFF1C9") },
  num: { position: "absolute", bottom: 2, minWidth: 22, paddingHorizontal: 4, borderRadius: 11, alignItems: "center", backgroundColor: K.bg("#FFF8EA"), borderWidth: 1.5, borderColor: K.bd("#E9D3A8") },
  numToday: { backgroundColor: C.green, borderColor: C.green },
  numOpen: { opacity: 0.7 },
  check: { position: "absolute", top: 4, right: 6, width: 20, height: 20 },
  panel: { alignItems: "center", paddingTop: 6 },
  giftRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, backgroundColor: K.bg("#FFF6E3") },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  mini: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 10, padding: 6, borderRadius: 12, backgroundColor: K.bg("#F6F1E6") },
  stepReady: { backgroundColor: K.bg("#E4F6E9"), borderWidth: 1.5, borderColor: "#9ED7AE" },
  stepAt: { width: 46, flexDirection: "row", alignItems: "center", gap: 3 },
}));
