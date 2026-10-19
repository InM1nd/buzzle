import { t, t as tt } from "../i18n";
import { currentTasks } from "../logic/game";
import { WEEKLY_TASKS } from "../logic/tasks";
import { boxArt } from "../ui/lootUi";
import React, { useRef } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { GameState, canClaimLogin, level, nextLoginIndex, canClaimWeekly, canBuyFreeze, FREEZE_COST, WEEKLY_REWARD, dailyStreak } from "../logic/game";
import { LOGIN_REWARDS, loginReward, taskReward, tasksForDay, bonusReward } from "../logic/tasks";
import { ART } from "../ui/art";
import { C, K, themed } from "../ui/theme";
import { Bar, Card, fmt, GameButton, Txt, useTopPad } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration } from "../ui/format";
import { Mascot } from "../ui/BeeSprite";
import { EventCard } from "./EventTrack";

interface Props {
  s: GameState;
  now: number;
  onClaimLogin: (from: Pt | null) => void;
  onClaimTask: (id: string, from: Pt | null) => void;
  onClaimBonus: (from: Pt | null) => void;
  onClaimWeekly?: (from: Pt | null) => void;
  onBuyFreeze?: () => boolean;
  onClaimTrack: (from: Pt | null) => void;
}

export default function TasksScreen({ s, now, onClaimLogin, onClaimTask, onClaimBonus, onClaimWeekly, onBuyFreeze, onClaimTrack }: Props) {
  const weekRef = useRef<View | null>(null);
  const streak = dailyStreak(s, now);
  const lvl = level(s);
  const canLogin = canClaimLogin(s, now);
  const idx = canLogin ? nextLoginIndex(s, now) : s.login.index;
  const tasks = currentTasks(s);
  const doneCount = s.tasks.claimed.length;
  const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const loginRef = useRef<View>(null);
  const bonusRef = useRef<View>(null);
  const taskRefs = useRef<Record<string, View | null>>({});
  const tr = taskReward(lvl), br = bonusReward(lvl);
  const readyCount = tasks.filter((t) => !s.tasks.claimed.includes(t.id) && (s.tasks.progress[t.id] ?? 0) >= t.target).length;
  const say = canLogin ? t("tasks.sayLogin")
    : readyCount > 0 ? t("tasks.sayReady")
    : doneCount >= tasks.length ? t("tasks.sayAll")
    : t("tasks.sayProgress", { a: doneCount, b: tasks.length });

  const top = useTopPad();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 + top, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
      <Txt v="h1" style={{ marginBottom: 2 }}>{t("tab.tasks")}</Txt>
      <EventCard s={s} now={now} onClaim={onClaimTrack} />
      {/* mascot */}
      <View style={styles.mascotRow}>
        <Mascot id="zhuzha" size={84} seed={9} />
        <View style={styles.bubble}>
          <View style={styles.bubbleTail} />
          <Txt v="small" color={C.text}>{say}</Txt>
        </View>
      </View>
      {/* daily tasks */}
      <Card active>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Txt v="h2" style={{ flex: 1 }}>{t("tasks.daily")}</Txt>
          <Image source={ART.clock} style={{ width: 14, height: 14, tintColor: C.dim, marginRight: 4 }} />
          <Txt v="small" color={C.dim}>{duration(midnight.getTime() - now)}</Txt>
        </View>
        {tasks.map((t) => {
          const p = Math.min(t.target, s.tasks.progress[t.id] ?? 0);
          const claimed = s.tasks.claimed.includes(t.id);
          const ready = !claimed && p >= t.target;
          return (
            <View key={t.id} style={[styles.task, claimed && { opacity: 0.6 }]}>
              <View style={{ flex: 1 }}>
                <Txt v="body" style={{ marginBottom: 6 }}>{t.text}</Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Bar progress={p / t.target} height={10} color={claimed || ready ? C.green : C.honey} style={{ flex: 1 }} />
                  <Txt v="tiny" color={C.dim}>{fmt(p)}/{fmt(t.target)}</Txt>
                </View>
              </View>
              <View ref={(r) => { taskRefs.current[t.id] = r; }} collapsable={false} style={{ width: 92, alignItems: "center" }}>
                {claimed ? (
                  <Image source={ART.check} style={{ width: 34, height: 34 }} />
                ) : ready ? (
                  <GameButton small title={tt("tasks.claim")} color="green" onPress={async () => onClaimTask(t.id, await centerOf(taskRefs.current[t.id]))} style={{ width: 92 }} label={tt("tasks.claimLabel", { t: t.text })} />
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <View style={styles.rew}><Image source={ART.honey} style={{ width: 16, height: 16 }} /><Txt v="tiny">{fmt(tr.honey ?? 0)}</Txt></View>
                    <View style={styles.rew}><Image source={ART.jelly} style={{ width: 16, height: 16 }} /><Txt v="tiny">{tr.jelly}</Txt></View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <View style={styles.bonus}>
          <Image source={s.tasks.bonus ? ART.chestOpen : ART.chest} style={{ width: 48, height: 48, opacity: s.tasks.bonus ? 0.6 : 1 }} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t("tasks.chest")}</Txt>
            <Txt v="small" color={C.dim}>{s.tasks.bonus ? t("tasks.chestGot") : t("tasks.chestHint", { h: fmt(br.honey ?? 0), j: br.jelly ?? 0 })}</Txt>
          </View>
          <View ref={bonusRef} collapsable={false}>
            {!s.tasks.bonus ? (
              <GameButton small title={doneCount >= 3 ? t("tasks.open") : `${doneCount}/3`} color={doneCount >= 3 ? "honey" : "grey"} disabled={doneCount < 3}
                onPress={async () => onClaimBonus(await centerOf(bonusRef.current))} style={{ width: 92 }} label={t("tasks.openChest")} />
            ) : null}
          </View>
        </View>
      </Card>

      {/* weekly chest: title + counter, full-width bar, the reward as chips, claim button under it */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessibilityLabel={t("tasks.weekLabel", { a: Math.min(s.week.tasks, WEEKLY_TASKS), b: WEEKLY_TASKS })}>
          <Image source={boxArt("wax")} style={{ width: 52, height: 52, opacity: s.week.chest ? 0.5 : 1 }} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt v="h3">{t("tasks.week")}</Txt>
            <Txt v="tiny" color={C.dim}>{s.week.chest ? t("tasks.weekGot") : t("tasks.weekSub")}</Txt>
          </View>
          {s.week.chest ? <Image source={ART.check} style={{ width: 28, height: 28 }} />
            : <View style={styles.count}><Txt v="small" color={C.text}>{Math.min(s.week.tasks, WEEKLY_TASKS)}/{WEEKLY_TASKS}</Txt></View>}
        </View>
        <Bar progress={Math.min(1, s.week.tasks / WEEKLY_TASKS)} height={10} color={C.jelly} style={{ marginTop: 10 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <View style={styles.rewChip}><Image source={boxArt("wax")} style={{ width: 20, height: 20 }} /><Txt v="small">×{WEEKLY_REWARD.wax}</Txt></View>
          <View style={styles.rewChip}><Image source={ART.jelly} style={{ width: 18, height: 18 }} /><Txt v="small">×{WEEKLY_REWARD.jelly}</Txt></View>
          <View style={{ flex: 1 }} />
          <View ref={weekRef} collapsable={false}>
            {canClaimWeekly(s) && onClaimWeekly ? (
              <GameButton small title={t("tasks.claim")} color="green" onPress={async () => onClaimWeekly(await centerOf(weekRef.current))} label={t("ls.claimChest")} style={{ width: 120 }} />
            ) : null}
          </View>
        </View>
      </Card>

      {/* login calendar */}
      <Card active>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Txt v="h2" style={{ flex: 1 }}>{t("tasks.login")}</Txt>
          {s.login.streak > 0 ? (
            <View style={styles.streak}><Image source={ART.flame} style={{ width: 16, height: 16 }} /><Txt v="tiny" color={C.honeyDark}>{t("tasks.streakD", { n: s.login.streak })}</Txt></View>
          ) : null}
        </View>
        <View style={styles.week}>
          {LOGIN_REWARDS.map((_, i) => {
            const r = loginReward(i, lvl);
            const claimed = canLogin ? i < idx : i <= idx;
            const current = canLogin && i === idx;
            return (
              <View key={i} style={[styles.day, claimed && styles.dayClaimed, current && styles.dayCurrent, i === 6 && { flex: 1.35 }]}>
                <Txt v="tiny" color={current ? "#fff" : C.dim}>{i === 6 ? t("tasks.day7") : t("tasks.dayN", { n: i + 1 })}</Txt>
                <Image source={i === 6 ? ART.chest : r.jelly && !r.honey ? ART.jelly : ART.honey} style={{ width: 26, height: 26, opacity: claimed ? 0.45 : 1 }} />
                {claimed ? <Image source={ART.check} style={styles.dayCheck} /> : null}
                <Txt v="tiny" color={current ? "#fff" : C.text} numberOfLines={1}>{r.honey ? fmt(r.honey) : `${r.jelly}`}</Txt>
              </View>
            );
          })}
        </View>
        <View ref={loginRef} collapsable={false}>
          <GameButton
            title={canLogin ? t("tasks.claimReward") : t("tasks.tomorrow")}
            color={canLogin ? "green" : "grey"}
            disabled={!canLogin}
            onPress={async () => onClaimLogin(await centerOf(loginRef.current))}
            label={t("tasks.claimLogin")}
          />
        </View>
      </Card>

      {/* v1.5: streak freeze lives next to the streak */}
      {onBuyFreeze ? (
        <Card>
          <Txt v="h3" style={{ marginBottom: 8 }}>{t("ls.freeze")}</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={ART.freeze} style={{ width: 46, height: 46 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Txt v="small" color={C.dim}>{t("ls.freezeSub")}</Txt>
              <Txt v="tiny" color={s.daily.freeze ? C.greenDark : C.dim} style={{ marginTop: 2 }}>
                {s.daily.freeze ? t("ls.freezeStock", { n: streak }) : s.week.freezeBought ? t("ls.freezeBought") : t("ls.freezeStreak", { n: streak })}
              </Txt>
            </View>
            {!s.daily.freeze && !s.week.freezeBought ? (
              <GameButton small title={fmt(FREEZE_COST)} label={t("ls.buyFor", { n: FREEZE_COST })} icon={ART.jelly} color={canBuyFreeze(s) ? "honey" : "grey"} disabled={!canBuyFreeze(s)} onPress={onBuyFreeze} style={{ width: 84, minWidth: 0 }} />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* stats */}
      <Card>
        <Txt v="h3" style={{ marginBottom: 8 }}>{t("tasks.stats")}</Txt>
        <View style={styles.stats}>
          <Stat label={t("stat.rounds")} value={fmt(s.stats.rounds)} />
          <Stat label={t("stat.best")} value={fmt(s.stats.bestScore)} />
          <Stat label={t("stat.chain")} value={String(s.stats.longestChain)} />
          <Stat label={t("stat.honey")} value={fmt(s.stats.totalHoney)} />
          <Stat label={t("stat.bombs")} value={fmt(s.stats.bombs)} />
          <Stat label={t("stat.streak")} value={String(s.daily.best)} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt v="num" color={C.honeyDark}>{value}</Txt>
      <Txt v="tiny" color={C.dim} style={{ fontSize: 10, lineHeight: 14 }}>{label.toUpperCase()}</Txt>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  mascotRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: -4 },
  bubble: { flex: 1, backgroundColor: K.bg("#FFFDF6"), borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: K.bd("#F6D594") },
  bubbleTail: { position: "absolute", left: -8, top: "50%", marginTop: -7, width: 14, height: 14, backgroundColor: K.bg("#FFFDF6"), borderLeftWidth: 2, borderBottomWidth: 2, borderColor: K.bd("#F6D594"), transform: [{ rotate: "45deg" }] },
  streak: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: K.bg("#FFF1D4"), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  week: { flexDirection: "row", gap: 5, marginVertical: 12 },
  day: { flex: 1, alignItems: "center", gap: 3, backgroundColor: K.bg("#FFF6E3"), borderRadius: 14, paddingVertical: 8, borderWidth: 2, borderColor: K.bd("#F3E1BE") },
  dayClaimed: { backgroundColor: K.bg("#F4F0E8"), borderColor: K.bd("#ECE3D2") },
  dayCurrent: { backgroundColor: C.honeyDeep, borderColor: K.bd("#FFCB5C") },
  dayCheck: { position: "absolute", top: 22, width: 22, height: 22 },
  task: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rew: { flexDirection: "row", alignItems: "center", gap: 3 },
  bonus: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, backgroundColor: K.bg("#FFF6E3"), borderRadius: 18, padding: 10 },
  count: { backgroundColor: K.bg("#F1E8FF"), borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  rewChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: K.bg("#FFF6E3"), borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  stat: { width: "33.3%", paddingRight: 6 },
}));
