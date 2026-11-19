import { t } from "../i18n";
import { RoundBoosters, RoundMode, weekendOpen } from "../logic/game";
import { BoosterId, BOOSTERS, SHOP_BOOSTER } from "../logic/loot";
import { WEEKEND_MOVES, WEEKEND_STARS } from "../logic/day";
import { BOOSTER_ART } from "../ui/lootUi";
import React from "react";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, View } from "react-native";
import { GameState, boosts, dailyStreak, dayColorInfo, freeMoves, puzzleHoneyMult, today } from "../logic/game";
import { FLOWERS } from "../logic/garden";
import { DAILY_MOVES, DAILY_STARS } from "../logic/day";
import { colorName } from "../logic/bees";
import { ART } from "../ui/art";
import { C, F, shadow, K, themed, activeCard, isNight } from "../ui/theme";
import { Bobbing, Card, CloseBtn, fmt, GameButton, Glow, Overlay, Press, Stars, Txt, useTopPad, useBottomPad, FitTxt, fitSize } from "../ui/components";
import { dateLong, days, weekday } from "../ui/format";
import { activeEvent } from "../logic/event";
import { winterId } from "../logic/winter";
import { Pt } from "../ui/Fly";
import { EventCard, EventUi } from "./EventTrack";

interface Props { s: GameState; now: number; onPlay: (mode: RoundMode, boosters?: RoundBoosters) => void; onBuyBooster: (b: BoosterId) => boolean; onClaimTrack: (from: Pt | null) => void; onFlight: () => void }

function HexCluster() {
  const pos = [[0, 0, 2], [1, -0.5, 0], [1, 0.5, 1], [-1, -0.5, 3], [-1, 0.5, 0], [0, -1, 4], [0, 1, 2]];
  const s = 17, cx = 2.5 * s, cy = 2.6 * s;
  return (
    <View style={{ width: 5 * s, height: 5.2 * s }}>
      {pos.map(([q, r, c], i) => (
        <Image key={i} source={ART.cells[c]} style={{ position: "absolute", width: 2 * s * 0.96, height: 1.732 * s * 0.96, left: cx + q * 1.5 * s - 0.96 * s, top: cy + r * 1.732 * s - 0.83 * s }} />
      ))}
    </View>
  );
}

export default function PuzzleScreen({ s, now, onPlay, onBuyBooster, onClaimTrack, onFlight }: Props) {
  const [pick, setPick] = React.useState(false);
  const [useMoves, setUseMoves] = React.useState(false);
  const [useBomb, setUseBomb] = React.useState(false);
  const bs = s.loot.boosters;
  // #18: a choice only counts while the booster is in stock (a stale tick stayed on after the last one was used)
  const takeMoves = useMoves && bs.moves > 0, takeBomb = useBomb && bs.bomb > 0;
  const boostFs = Math.min(...(["moves", "bomb", "shuffle"] as const).map((id) => fitSize(BOOSTERS[id].name, 15, 13)));
  const d = today(s, now);
  const res = s.daily.results[d];
  const streak = dailyStreak(s, now);
  const b = boosts(s);
  const date = new Date(now);
  // round bonuses on the free play card: one icon + one short label each
  const chips: { k: string; icon: ImageSourcePropType; text: string }[] = [];
  const halloween = !!activeEvent(d) && React.useContext(EventUi);
  // 1.7: snowflake tiles in winter free play
  const winter = !halloween && !!winterId(d);
  if (halloween) chips.push({ k: "ev", icon: ART.pumpkin, text: t("pz.chipEvent") });
  if (winter) chips.push({ k: "flake", icon: ART.flakeTile, text: t("win.chip") });
  if (freeMoves(s) > 20) chips.push({ k: "mv", icon: BOOSTER_ART.moves, text: t("pz.chipMoves", { n: freeMoves(s) - 20 }) });
  b.colorMult.forEach((m, i) => { if (m > 1) chips.push({ k: `c${i}`, icon: ART.cells[i], text: t("pz.chipColor", { color: colorName(i), x: Math.round(m * 100) / 100 }) }); });
  const dc = dayColorInfo(s, now);
  if (b.wildChance > 0) chips.push({ k: "wild", icon: ART.wild, text: t("pz.chipJokers") });
  if (b.bombAt < 6) chips.push({ k: "bomb", icon: ART.bomb, text: t("pz.chipBomb", { n: b.bombAt }) });
  const honeyBonus = Math.round((puzzleHoneyMult(s) - 1) * 100);
  if (honeyBonus > 0) chips.push({ k: "honey", icon: ART.honey, text: t("pz.chipHoney", { n: honeyBonus }) });

  const top = useTopPad();

  const bottom = useBottomPad();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + top, paddingBottom: bottom, gap: 14 }} showsVerticalScrollIndicator={false}>
      <Txt v="h1" style={{ marginBottom: 2 }}>{t("tab.puzzle")}</Txt>
      <EventCard s={s} now={now} onClaim={onClaimTrack} />
      <View style={[styles.daily, shadow, activeCard()]}>
        <Glow radius={28} />
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color={"#8A5200"}>{t("pz.dailyCaps")}</Txt>
            <Txt v="h1" color={"#4A2C12"} style={{ marginTop: 2 }}>{dateLong(date)}</Txt>
            <Txt v="small" color={"#8A5200"}>{t("pz.dailySub", { wd: weekday(date), n: DAILY_MOVES })}</Txt>
          </View>
          <Bobbing amp={4}><HexCluster /></Bobbing>
        </View>
        <View style={styles.dailyRow}>
          <Stars n={res?.stars ?? 0} size={34} gap={4} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {res ? <Txt v="small" color={"#8A5200"}>{t("pz.bestScore")}</Txt> : null}
            {res ? <Txt v="num" color={"#4A2C12"}>{fmt(res.score)}</Txt> : <Txt v="small" color={"#8A5200"}>{t("pz.notPlayed")}</Txt>}
          </View>
        </View>
        <View style={styles.thresholds}>
          {DAILY_STARS.map((t, i) => (
            <View key={i} style={styles.th}>
              <Image source={ART.star} style={{ width: 16, height: 16 }} />
              <Txt v="small" color={"#6B3E00"}>{fmt(t)}</Txt>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 12 }}>
          <Image source={ART.flame} style={{ width: 22, height: 22, opacity: streak ? 1 : 0.4 }} />
          <Txt v="small" color={"#6B3E00"}>
            {streak ? t("pz.streak", { n: streak }) : t("pz.startStreak")}
            {s.daily.best > 1 ? t("pz.bestStreak", { n: s.daily.best }) : ""}
          </Txt>
        </View>
        <GameButton
          title={res?.stars === 3 ? t("pz.replay") : res ? t("pz.retry") : t("pz.play")}
          sub={res ? t("pz.bestCounts") : t("pz.starsJelly")}
          color={res?.stars === 3 ? "white" : "green"}
          onPress={() => onPlay("daily")}
          label={t("pz.playDaily")}
        />
      </View>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.freeIcon}><Image source={ART.honey} style={{ width: 42, height: 42 }} /></View>
          <View style={{ flex: 1 }}>
            <Txt v="h2">{t("mode.free")}</Txt>
            <Txt v="small" color={C.dim}>{t("pz.freeSub", { n: freeMoves(s) })}</Txt>
          </View>
        </View>
        {/* #18: the colour of the day is a free play bonus only, so it lives in this card (the daily puzzle no longer shows it) */}
        <View style={[styles.dayColor, { borderColor: dc.active ? C.pollen[dc.color] : C.line, borderStyle: dc.active ? "solid" : "dashed" }]} accessibilityLabel={t("pz.dayColor")}>
          <Image source={ART.cells[dc.color]} style={{ width: 34, height: 30, opacity: dc.active ? 1 : 0.55 }} />
          <View style={{ flex: 1 }}>
            <Txt v="small" style={F.black} numberOfLines={1}>{t("pz.dayColorTitle", { color: colorName(dc.color) })}</Txt>
            <Txt v="tiny" color={dc.active ? C.greenDark : C.dim} numberOfLines={2}>
              {dc.active ? t("pz.dayColorOn") : t("pz.dayColorOff", { flower: FLOWERS.find((f) => f.color === dc.color)!.name })}
            </Txt>
          </View>
        </View>
        {chips.length ? (
          <>
            <Txt v="tiny" color={C.dim} style={{ marginTop: 12, letterSpacing: 0.6 }}>{t("pz.bonuses").toLocaleUpperCase()}</Txt>
            <View style={styles.chips}>
              {chips.map((c) => (
                <View key={c.k} style={styles.chip}>
                  <Image source={c.icon} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Txt v="tiny" numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontWeight: "800" }}>{c.text}</Txt>
                </View>
              ))}
            </View>
          </>
        ) : <Txt v="small" color={C.dim} style={{ marginTop: 10 }}>{t("pz.unlockBees")}</Txt>}
        {s.stats.bestScore > 0 ? <Txt v="small" color={C.dim} style={{ marginTop: 8 }}>{t("pz.record", { n: fmt(s.stats.bestScore) })}</Txt> : null}
        {/* boosters you take into the round, always visible */}
        <View style={styles.boostRow}>
          {(["moves", "bomb", "shuffle"] as const).map((id) => (
            <View key={id} style={[styles.boostMini, (id === "moves" ? takeMoves : id === "bomb" ? takeBomb : false) && styles.boostOn]}>
              <Image source={BOOSTER_ART[id]} style={{ width: 26, height: 26 }} resizeMode="contain" />
              <Txt v="tiny" color={bs[id] ? C.text : C.faint} style={{ fontWeight: "900" }}>×{bs[id]}</Txt>
            </View>
          ))}
        </View>
        <GameButton title={t("pz.play")} color="honey" style={{ marginTop: 12 }} onPress={() => setPick(true)} label={t("mode.free")} />
      </Card>

      {/* side modes share one card layout (#18); a seasonal game shows only in its season (Night Flight: the Halloween event) */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <ModeCard icon={<Image source={ART.cells[2]} style={{ width: 38, height: 34 }} />} title={t("pz.weekend")} sub={t("pz.weekendSub", { n: WEEKEND_MOVES })}
          extra={<Stars n={s.week.weekendStars} size={14} />} bg={K.bg("#F1E9FF")} border={weekendOpen(s, now) ? "#9A6BE0" : "#E2D6F7"}
          button={{ title: weekendOpen(s, now) ? t("pz.play") : t("pz.weekendOnly"), color: weekendOpen(s, now) ? "purple" : "grey", disabled: !weekendOpen(s, now), onPress: () => onPlay("weekend"), label: t("mode.weekend") }} />
        {halloween ? (
          <ModeCard dark icon={<Image source={ART.flightIcon} style={{ width: 38, height: 38 }} />} title={t("fl.title")} sub={t("fl.sub")}
            extra={s.flight.best > 0 ? <Txt v="tiny" color={K.fg("#FFC56B")}>{t("fl.best", { n: s.flight.best })}</Txt> : null}
            bg={K.bg("#2B1B3D")} border={K.bd("#3A2F5B")} button={{ title: t("pz.play"), color: "honey", onPress: onFlight, label: t("fl.title") }} />
        ) : null}
      </View>

      <Card>
        <Txt v="h3" style={{ marginBottom: 10 }}>{t("pz.how")}</Txt>
        <Rule img={ART.cells[1]} title={t("pz.r1")} text={t("pz.r1t")} />
        <Rule img={ART.cells[0]} overlay={ART.bomb} title={t("pz.r2")} text={t("pz.r2t")} />
        <Rule img={ART.wild} title={t("pz.r3")} text={t("pz.r3t")} />
        <Rule img={ART.flame} title={t("pz.r4")} text={t("pz.r4t")} />
        {halloween ? <Rule img={ART.pumpkin} title={t("ev.rPumpkin")} text={t("ev.rPumpkinT")} /> : null}
        {winter ? <Rule img={ART.flakeTile} title={t("win.rFlake")} text={t("win.rFlakeT")} /> : null}
        {halloween ? <Rule img={ART.cells[3]} overlay={ART.ghost} title={t("ev.rGhost")} text={t("ev.rGhostT")} /> : null}
      </Card>
      <Overlay visible={pick} onClose={() => setPick(false)}>
        <CloseBtn onPress={() => setPick(false)} />
        <Txt v="h2" style={{ marginBottom: 2, paddingRight: 44 }}>{t("mode.free")}</Txt>
        <Txt v="small" color={C.dim} style={{ marginBottom: 12, paddingRight: 44 }}>{t("pz.pickBoosters")}</Txt>
        <View style={{ gap: 10 }}>
          {/* one font size for all three names (the longest decides), so the cards read evenly */}
          {(["moves", "bomb", "shuffle"] as const).map((id) => {
            const have = bs[id], price = SHOP_BOOSTER[id];
            const on = id === "moves" ? takeMoves : id === "bomb" ? takeBomb : false;
            const toggle = id === "moves" ? () => setUseMoves(!useMoves) : id === "bomb" ? () => setUseBomb(!useBomb) : null;
            return (
              <View key={id} style={[styles.boostCard, on && styles.boostOn, { flexWrap: "wrap", gap: 10, paddingHorizontal: 10 }]}>
                {/* one tidy row: icon with the count badge · one-line name over a two-line description · price / switch */}
                <View style={{ width: 40, height: 40 }}>
                  <Image source={BOOSTER_ART[id]} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  <View style={[styles.countBadge, have > 0 && styles.countBadgeOn]} accessibilityLabel={`×${have}`}>
                    <Txt v="tiny" color={have > 0 ? "#fff" : C.dim} style={[F.black, { fontSize: 10, lineHeight: 13 }]}>×{have}</Txt>
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <FitTxt text={BOOSTERS[id].name} base={boostFs} chars={99} />
                </View>
                {have > 0 && toggle ? (
                  <Press onPress={toggle} style={[styles.check, on && styles.checkOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={BOOSTERS[id].name} scaleTo={0.9}>
                    {on ? <Image source={ART.check} style={{ width: 22, height: 22 }} /> : null}
                  </Press>
                ) : have === 0 ? (
                  <GameButton small title={`${price}`} icon={ART.pollen} color={s.loot.pollen >= price ? "green" : "white"} disabled={s.loot.pollen < price}
                    onPress={() => onBuyBooster(id)} label={t("pz.buyBooster", { name: BOOSTERS[id].name, n: price })} style={{ minWidth: 0, width: 66 }} />
                ) : (
                  // #18: shuffle is not taken into the round (it is a button during the round): a quiet label, not a tick that looked "on by default"
                  <View style={styles.inRound}><Txt v="tiny" color={C.dim} style={{ fontWeight: "800" }} numberOfLines={1}>{t("pz.inRound")}</Txt></View>
                )}
                {/* the description runs under the whole row (two lines reserved so all three cards are the same height) */}
                <Txt v="tiny" color={C.dim} numberOfLines={2} style={{ width: "100%", minHeight: 30, paddingLeft: 50, marginTop: -4 }}>{id === "shuffle" ? t("pz.shuffleInRound") : BOOSTERS[id].desc}</Txt>
              </View>
            );
          })}
        </View>
        <Txt v="tiny" color={C.dim} center style={{ marginTop: 10 }}>{t("pz.pollenHave", { n: fmt(s.loot.pollen) })}</Txt>
        <GameButton title={takeMoves || takeBomb ? t("pz.playWith") : t("pz.play")} color="green" style={{ marginTop: 12 }}
          onPress={() => { setPick(false); onPlay("free", { moves: takeMoves, bomb: takeBomb }); setUseMoves(false); setUseBomb(false); }} label={t("pz.startFree")} />
      </Overlay>
    </ScrollView>
  );
}

/** a side mode (weekend puzzle, seasonal mini-games): icon, title, one line, an extra line (stars / record), button at the bottom */
function ModeCard({ icon, title, sub, extra, bg, border, dark, button }: {
  icon: React.ReactNode; title: string; sub: string; extra?: React.ReactNode; bg: string; border: string; dark?: boolean;
  button: { title: string; color: "purple" | "grey" | "honey" | "green"; disabled?: boolean; onPress: () => void; label: string };
}) {
  return (
    <Card style={{ flex: 1, backgroundColor: bg, borderWidth: 2, borderColor: border }}>
      {icon}
      <Txt v="h3" color={dark ? "#fff" : undefined} style={{ marginTop: 6 }} numberOfLines={1}>{title}</Txt>
      <Txt v="tiny" color={dark ? K.fg("#BFF5E6") : C.dim} numberOfLines={2} style={{ minHeight: 28 }}>{sub}</Txt>
      <View style={{ marginTop: 4, minHeight: 16 }}>{extra}</View>
      <View style={{ flex: 1 }} />
      <GameButton title={button.title} color={button.color} disabled={button.disabled} style={{ marginTop: 8 }} onPress={button.onPress} label={button.label} />
    </Card>
  );
}

function Rule({ img, overlay, title, text }: { img: number; overlay?: number; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "center" }}>
      <View style={{ width: 44, height: 38 }}>
        <Image source={img} style={{ width: 44, height: 38 }} resizeMode="contain" />
        {overlay ? <Image source={overlay} style={{ position: "absolute", width: 44, height: 38 }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="h3" style={{ fontSize: 15 }}>{title}</Txt>
        <Txt v="small" color={C.dim}>{text}</Txt>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  daily: { backgroundColor: isNight() ? "#FFB52E" : "#FFC94A", borderRadius: 28, padding: 18, borderWidth: 3, borderColor: "#FFB51F" },
  dailyRow: { flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: K.bg("rgba(255,255,255,0.45)"), borderRadius: 18, padding: 10 },
  thresholds: { flexDirection: "row", gap: 8, marginTop: 10 },
  th: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: K.bg("rgba(255,255,255,0.45)"), borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  freeIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: K.bg("#FFF3D6"), alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  boostRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  boostMini: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, borderWidth: 2, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: K.bg("#fff") },
  boostCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, borderWidth: 2, borderColor: C.line, padding: 10, backgroundColor: K.bg("#fff") },
  dayColor: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 8, borderRadius: 14, borderWidth: 2 },
  inRound: { paddingHorizontal: 8, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#F4EEE2") },
  check: { width: 40, height: 40, borderRadius: 14, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#fff") },
  checkOn: { borderColor: C.green, backgroundColor: K.bg("#E4F7EA") },
  boost: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, borderWidth: 2, borderColor: C.line, padding: 6, backgroundColor: K.bg("#fff") },
  countBadge: { position: "absolute", right: -6, bottom: -4, minWidth: 22, paddingHorizontal: 4, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#F3EAD8"), borderWidth: 1.5, borderColor: K.bd("#fff") },
  countBadgeOn: { backgroundColor: C.green },
  boostOn: { borderColor: C.green, backgroundColor: K.bg("#E4F7EA") },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingLeft: 6, paddingRight: 10, borderRadius: 14, backgroundColor: K.bg("#FFF6E3"), borderWidth: 1.5, borderColor: C.line },
}));
