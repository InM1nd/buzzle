/** v1.6 seasonal event card (Play and Tasks tabs) with the reward track window. */
import React, { useRef, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { t, tx } from "../i18n";
import { claimable, TRACK, TrackReward } from "../logic/event";
import { eventView, GameState } from "../logic/game";
import { BOX_INFO } from "../logic/loot";
import { ART } from "../ui/art";
import { Bar, Bobbing, CloseBtn, GameButton, Overlay, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { boxArt, ItemIcon } from "../ui/lootUi";
import { shadow } from "../ui/theme";

const NIGHT = { bg: "#2B1B3D", card: "#3A2F5B", pumpkin: "#F08A24", candle: "#FFC56B", ghost: "#BFF5E6" };

function rewardLook(r: TrackReward): { icon: ImageSourcePropType | null; skin?: string; title: string } {
    if (r.skin) return { icon: null, skin: r.skin, title: `${t("ev.costume")}: ${tx(`item.${r.skin}`)}` + (r.box ? ` + ${BOX_INFO[r.box].name}` : "") };
  if (r.box) return { icon: boxArt(r.box), title: BOX_INFO[r.box].name };
  if (r.seeds) return { icon: ART.seed, title: t("ev.seeds", { n: r.seeds.n }) };
  if (r.jelly) return { icon: ART.jelly, title: `+${r.jelly}` };
  return { icon: ART.honey, title: `+${r.honey ?? 0}` };
}

export function EventCard({ s, now, onClaim }: { s: GameState; now: number; onClaim: (from: Pt | null) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<View>(null);
  const v = eventView(s, now);
  if (!v) return null;
  const e = v.progress;
  const next = TRACK[e.claimed];
  const ready = claimable(e);
  const prevAt = e.claimed > 0 ? TRACK[e.claimed - 1].at : 0;
  const progress = next ? (e.points - prevAt) / (next.at - prevAt) : 1;
  return (
    <View style={[styles.card, shadow]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Bobbing amp={3}><Image source={ART.pumpkin} style={{ width: 58, height: 50 }} /></Bobbing>
        <View style={{ flex: 1 }}>
          <Txt v="h2" color="#fff">{t("ev.title")}</Txt>
          <Txt v="small" color={NIGHT.candle}>{v.running ? t("ev.daysLeft", { n: v.daysLeft }) : t("ev.ended")}</Txt>
        </View>
        <View style={styles.points}>
          <Image source={ART.point} style={{ width: 24, height: 24 }} />
          <Txt v="h3" color="#fff">{e.points}</Txt>
        </View>
      </View>
      {v.running ? <Txt v="tiny" color={NIGHT.ghost} style={{ marginTop: 8 }}>{t("ev.sub")}</Txt> : null}
      <View style={{ marginTop: 10 }}>
        <Bar progress={Math.min(1, progress)} height={10} color={NIGHT.pumpkin} track="rgba(255,255,255,0.15)" />
        <Txt v="tiny" color={NIGHT.candle} style={{ marginTop: 4 }}>
          {next ? (ready ? t("ev.points", { n: e.points }) : t("ev.next", { n: next.at - e.points })) : t("ev.done")}
        </Txt>
      </View>
      <View ref={btn} collapsable={false}>
        <GameButton small title={ready ? t("ev.claimN", { n: ready }) : t("ev.open")} color={ready ? "green" : "white"} style={{ marginTop: 10 }}
          onPress={() => setOpen(true)} label={t("ev.track")} />
      </View>
      <Overlay visible={open} onClose={() => setOpen(false)}>
        <CloseBtn onPress={() => setOpen(false)} />
        <Txt v="h2" style={{ paddingRight: 44 }}>{t("ev.track")}</Txt>
        <Txt v="small" color="#8A5200" style={{ marginBottom: 12, paddingRight: 44 }}>{t("ev.how")}</Txt>
        <View style={{ gap: 8 }}>
          {TRACK.map((st, i) => {
            const look = rewardLook(st.reward);
            const done = i < e.claimed, reached = e.points >= st.at, isNext = i === e.claimed;
            return (
              <View key={i} style={[styles.step, done && styles.stepDone, isNext && reached && styles.stepReady]}>
                {look.skin ? <ItemIcon id={look.skin} size={36} /> : <Image source={look.icon!} style={{ width: 36, height: 36, opacity: reached || done ? 1 : 0.5 }} resizeMode="contain" />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="h3" style={{ fontSize: 14 }} numberOfLines={2}>{look.title}</Txt>
                  <Txt v="tiny" color="#8A6B4A">{t("ev.points", { n: st.at })}</Txt>
                </View>
                {done ? <Image source={ART.check} style={{ width: 26, height: 26 }} />
                  : isNext && reached ? (
                    <GameButton small title={t("ev.claim")} color="green" style={{ width: 96 }} label={`${t("ev.claim")}: ${look.title}`}
                      onPress={async () => onClaim(await centerOf(btn.current))} />
                  ) : <Image source={ART.lock} style={{ width: 20, height: 20, opacity: reached ? 0.3 : 0.6 }} />}
              </View>
            );
          })}
        </View>
      </Overlay>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: NIGHT.bg, borderRadius: 28, padding: 16, borderWidth: 3, borderColor: NIGHT.card },
  points: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: NIGHT.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  step: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, borderWidth: 2, borderColor: "#F0DFC0", padding: 8 },
  stepDone: { opacity: 0.6 },
  stepReady: { borderColor: "#4CC777", backgroundColor: "#E4F7EA" },
});
