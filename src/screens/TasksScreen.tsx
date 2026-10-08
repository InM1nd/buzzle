import React, { useRef } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { GameState, canClaimLogin, level, nextLoginIndex } from "../logic/game";
import { LOGIN_REWARDS, loginReward, taskReward, tasksForDay, bonusReward } from "../logic/tasks";
import { ART } from "../ui/art";
import { C } from "../ui/theme";
import { Bar, Card, fmt, GameButton, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { duration } from "../ui/format";
import { Toggle } from "../ui/Toggle";

interface Props {
  s: GameState;
  now: number;
  onClaimLogin: (from: Pt | null) => void;
  onClaimTask: (id: string, from: Pt | null) => void;
  onClaimBonus: (from: Pt | null) => void;
  onNotifications: (on: boolean) => void;
  notifBlocked: boolean;
}

export default function TasksScreen({ s, now, onClaimLogin, onClaimTask, onClaimBonus, onNotifications, notifBlocked }: Props) {
  const lvl = level(s);
  const canLogin = canClaimLogin(s, now);
  const idx = canLogin ? nextLoginIndex(s, now) : s.login.index;
  const tasks = tasksForDay(s.tasks.day);
  const doneCount = s.tasks.claimed.length;
  const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const loginRef = useRef<View>(null);
  const bonusRef = useRef<View>(null);
  const taskRefs = useRef<Record<string, View | null>>({});
  const tr = taskReward(lvl), br = bonusReward(lvl);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
      {/* login calendar */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Txt v="h2" style={{ flex: 1 }}>Награда за вход</Txt>
          {s.login.streak > 0 ? (
            <View style={styles.streak}><Image source={ART.flame} style={{ width: 16, height: 16 }} /><Txt v="tiny" color={C.honeyDark}>{s.login.streak} ДН.</Txt></View>
          ) : null}
        </View>
        <View style={styles.week}>
          {LOGIN_REWARDS.map((_, i) => {
            const r = loginReward(i, lvl);
            const claimed = canLogin ? i < idx : i <= idx;
            const current = canLogin && i === idx;
            return (
              <View key={i} style={[styles.day, claimed && styles.dayClaimed, current && styles.dayCurrent, i === 6 && { flex: 1.35 }]}>
                <Txt v="tiny" color={current ? "#fff" : C.dim}>{i === 6 ? "ДЕНЬ 7" : `Д${i + 1}`}</Txt>
                <Image source={i === 6 ? ART.chest : r.jelly && !r.honey ? ART.jelly : ART.honey} style={{ width: 26, height: 26, opacity: claimed ? 0.45 : 1 }} />
                {claimed ? <Image source={ART.check} style={styles.dayCheck} /> : null}
                <Txt v="tiny" color={current ? "#fff" : C.text} numberOfLines={1}>{r.honey ? fmt(r.honey) : `${r.jelly}`}</Txt>
              </View>
            );
          })}
        </View>
        <View ref={loginRef} collapsable={false}>
          <GameButton
            title={canLogin ? "Забрать награду" : "Завтра будет новая"}
            color={canLogin ? "green" : "grey"}
            disabled={!canLogin}
            onPress={async () => onClaimLogin(await centerOf(loginRef.current))}
            label="Забрать награду за вход"
          />
        </View>
      </Card>

      {/* daily tasks */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Txt v="h2" style={{ flex: 1 }}>Задания дня</Txt>
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
                  <GameButton small title="Забрать" color="green" onPress={async () => onClaimTask(t.id, await centerOf(taskRefs.current[t.id]))} style={{ width: 92 }} label={`Забрать: ${t.text}`} />
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
          <Image source={ART.chest} style={{ width: 48, height: 48, opacity: s.tasks.bonus ? 0.5 : 1 }} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">Сундук дня</Txt>
            <Txt v="small" color={C.dim}>{s.tasks.bonus ? "Получен. Новый — завтра!" : `Выполните все 3 задания: ${fmt(br.honey ?? 0)} мёда и ${br.jelly} молочка`}</Txt>
          </View>
          <View ref={bonusRef} collapsable={false}>
            {!s.tasks.bonus ? (
              <GameButton small title={doneCount >= 3 ? "Открыть" : `${doneCount}/3`} color={doneCount >= 3 ? "honey" : "grey"} disabled={doneCount < 3}
                onPress={async () => onClaimBonus(await centerOf(bonusRef.current))} style={{ width: 92 }} label="Открыть сундук дня" />
            ) : null}
          </View>
        </View>
      </Card>

      {/* notifications */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Напоминания</Txt>
            <Txt v="small" color={C.dim}>Когда улей полон и когда готова новая ежедневная головоломка.</Txt>
          </View>
          <Toggle value={s.settings.notifications} onChange={onNotifications} label="Напоминания" />
        </View>
        {notifBlocked ? <Txt v="small" color={C.red} style={{ marginTop: 8 }}>Уведомления запрещены в настройках Android для «Бзз».</Txt> : null}
      </Card>

      {/* stats */}
      <Card>
        <Txt v="h3" style={{ marginBottom: 8 }}>Статистика</Txt>
        <View style={styles.stats}>
          <Stat label="игр сыграно" value={fmt(s.stats.rounds)} />
          <Stat label="рекорд очков" value={fmt(s.stats.bestScore)} />
          <Stat label="самая длинная цепочка" value={String(s.stats.longestChain)} />
          <Stat label="мёда из головоломок" value={fmt(s.stats.totalHoney)} />
          <Stat label="взорвано бомб" value={fmt(s.stats.bombs)} />
          <Stat label="лучшая серия" value={String(s.daily.best)} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt v="num" color={C.honeyDark}>{value}</Txt>
      <Txt v="tiny" color={C.dim} numberOfLines={2}>{label.toUpperCase()}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFF1D4", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  week: { flexDirection: "row", gap: 5, marginVertical: 12 },
  day: { flex: 1, alignItems: "center", gap: 3, backgroundColor: "#FFF6E3", borderRadius: 14, paddingVertical: 8, borderWidth: 2, borderColor: "#F3E1BE" },
  dayClaimed: { backgroundColor: "#F4F0E8", borderColor: "#ECE3D2" },
  dayCurrent: { backgroundColor: C.honeyDeep, borderColor: "#FFCB5C" },
  dayCheck: { position: "absolute", top: 22, width: 22, height: 22 },
  task: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rew: { flexDirection: "row", alignItems: "center", gap: 3 },
  bonus: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, backgroundColor: "#FFF6E3", borderRadius: 18, padding: 10 },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  stat: { width: "33.3%", paddingRight: 6 },
});
