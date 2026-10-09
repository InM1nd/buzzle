import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Dimensions, Image, Linking, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  GameState, buyUpgrade, canClaimLogin, claimBonus, claimLogin, claimTask, collectHive, combAction, finishRound, freeMoves,
  level, newState, nextLoginIndex, RoundReward, RoundSummary, tick, unlockBee,
  dayColorInfo, harvestAction, levelUpBee, renameBee, plantFlower, unlockBed, waterAllAction, waterBedAction,
} from "./src/logic/game";
import { canWater, isReady } from "./src/logic/garden";
import { boostsFor, rulesFor } from "./src/logic/bees";
import { dailySeed, DAILY_MOVES } from "./src/logic/day";
import { loginReward, Reward } from "./src/logic/tasks";
import { UpgradeId } from "./src/logic/economy";
import { planNotifications } from "./src/logic/notifyPlan";
import { today as todayOf, cap as capOf } from "./src/logic/game";
import { tasksForDay } from "./src/logic/tasks";
import { flushCloud, loadState, saveState } from "./src/ui/store";
import { addBackListener, dispatchBack } from "./src/platform/back";
import { useInsets } from "./src/platform/insets";
import { pinArt } from "./src/platform/pinArt";
import { hideBootScreen, initTelegram, NOTIFICATIONS_SUPPORTED, onHide, setBackButton } from "./src/platform/telegram";
import { applyPlan, ensureChannel, getPermission, requestPermission } from "./src/ui/notifications";
import { hError, hSuccess, setHaptics } from "./src/ui/haptics";
import { ART } from "./src/ui/art";
import { TabIcon } from "./src/ui/TabIcon";
import { C, F, shadow } from "./src/ui/theme";
import { GameButton, Pill, Press, Txt } from "./src/ui/components";
import { centerOf, FlyProvider, Pt, useFly } from "./src/ui/Fly";
import HiveScreen from "./src/screens/HiveScreen";
import PuzzleScreen from "./src/screens/PuzzleScreen";
import BeesScreen from "./src/screens/BeesScreen";
import TasksScreen from "./src/screens/TasksScreen";
import GardenScreen from "./src/screens/GardenScreen";
import GameScreen from "./src/screens/GameScreen";
import { LoginModal, SettingsModal, Tutorial } from "./src/screens/Modals";

SplashScreen.preventAutoHideAsync().catch(() => {});
pinArt();          // web: keep all art in memory so remounts never refetch (no-op on Android)
initTelegram(C.bg); // web inside Telegram: ready/expand/fullscreen, no swipe-to-close, header colour

type Tab = "hive" | "puzzle" | "bees" | "tasks";
const TABS: { id: Tab; label: string; icon: number }[] = [
  { id: "hive", label: "Улей", icon: ART.tabHive },
  { id: "puzzle", label: "Головоломка", icon: ART.tabPuzzle },
  { id: "bees", label: "Пчёлы", icon: ART.tabBee },
  { id: "tasks", label: "Задания", icon: ART.tabTasks },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <FlyProvider>
        <Main />
      </FlyProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useInsets();
  const { fly } = useFly();
  const [cheer, setCheer] = useState(0);
  const [s, setS] = useState<GameState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>("hive");
  const [hiveView, setHiveView] = useState<"hive" | "garden">("hive");
  const [game, setGame] = useState<{ mode: "daily" | "free"; seed: number; key: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const [hold, setHold] = useState<{ honey?: number; jelly?: number; nectar?: number }>({});
  const [bump, setBump] = useState({ honey: 0, jelly: 0, nectar: 0 });
  const sRef = useRef<GameState | null>(null);
  sRef.current = s;
  const writable = useRef(false);
  const lastSave = useRef(0);
  const honeyIcon = useRef<View | null>(null);
  const jellyIcon = useRef<View | null>(null);
  const nectarIcon = useRef<View | null>(null);
  const pendingFly = useRef<Reward | null>(null);

  /** Replace state; persist now (actions) or at most every 15 s (ticks). */
  const commit = useCallback((next: GameState, force = true) => {
    setS(next);
    const t = Date.now();
    if (writable.current && (force || t - lastSave.current > 15000)) {
      lastSave.current = t;
      saveState(next);
    }
  }, []);

  // ----- boot -----
  useEffect(() => {
    loadState().then((l) => {
      writable.current = l.writable;
      const st = tick(l.state, Date.now());
      commit(st);
      setHaptics(st.settings.haptics);
      if (!st.settings.tutorialDone) setShowTutorial(true);
      else if (canClaimLogin(st, Date.now())) setShowLogin(true);
      SplashScreen.hideAsync().catch(() => {});
      hideBootScreen();
    });
    ensureChannel().catch(() => {});
  }, [commit]);

  // ----- clock -----
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = sRef.current;
      if (cur) commit(tick(cur, t), false);
    }, 1000);
    return () => clearInterval(id);
  }, [commit]);

  // ----- app state: reschedule notifications on background, refresh on resume -----
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      const cur = sRef.current;
      if (!cur) return;
      const t = Date.now();
      if (st === "background" || st === "inactive") {
        if (writable.current) saveState(cur);
        applyPlan(planNotifications(cur, t)).catch(() => {});
      } else if (st === "active") {
        const n = tick(cur, t);
        commit(n);
        if (n.settings.tutorialDone && canClaimLogin(n, t)) setShowLogin(true);
        if (n.settings.notifications) getPermission().then((p) => setNotifBlocked(p === "blocked")).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [commit]);

  // web: Telegram pauses hidden webviews — write the save (local + cloud) right away
  useEffect(() => onHide(() => {
    const cur = sRef.current;
    if (cur && writable.current) saveState(cur);
    flushCloud();
  }), []);

  useEffect(() => {
    const sub = addBackListener(() => {
      if (game) return false; // GameScreen handles its own back
      if (showSettings) { setShowSettings(false); return true; }
      if (showLogin) { setShowLogin(false); return true; }
      if (tab !== "hive") { setTab("hive"); return true; }
      if (hiveView !== "hive") { setHiveView("hive"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [game, showSettings, showLogin, tab, hiveView]);
  // Telegram's BackButton mirrors in-app navigation (hidden on the home screen)
  const canBack = !!game || showSettings || showLogin || tab !== "hive" || hiveView !== "hive";
  useEffect(() => setBackButton(canBack, () => { dispatchBack(); }), [canBack]);

  // ----- reward flight to the currency pills -----
  const flyReward = useCallback(async (from: Pt | null, r: Reward & { nectar?: number }, prev: GameState, bees?: string[]) => {
    const tasks: Promise<void>[] = [];
    const run = async (kind: "honey" | "jelly" | "nectar", amount: number | undefined) => {
      if (!amount) return;
      setHold((h) => ({ ...h, [kind]: prev[kind] })); // keep the pill at the old value until the drops land
      const to = await centerOf(kind === "honey" ? honeyIcon.current : kind === "jelly" ? jellyIcon.current : nectarIcon.current);
      if (!from || !to) { setHold((h) => ({ ...h, [kind]: undefined })); setBump((b) => ({ ...b, [kind]: b[kind] + 1 })); return; }
      fly({
        from, to, n: kind === "honey" ? Math.min(12, 4 + Math.ceil(Math.log2(amount + 1))) : kind === "nectar" ? Math.min(8, 3 + Math.ceil(amount / 6)) : Math.min(8, 2 + amount),
        img: kind === "honey" ? ART.honey : kind === "jelly" ? ART.jelly : ART.nectar,
        bees: kind === "honey" || kind === "nectar" ? bees : undefined,
        onArrive: () => { setHold((h) => ({ ...h, [kind]: undefined })); setBump((b) => ({ ...b, [kind]: b[kind] + 1 })); },
      });
    };
    tasks.push(run("honey", r.honey), run("jelly", r.jelly), run("nectar", r.nectar));
    await Promise.all(tasks);
  }, [fly]);

  // ----- actions -----
  const act = {
    collect: (from: Pt | null) => {
      if (!s) return;
      const r = collectHive(s, Date.now());
      if (r.amount <= 0) return;
      commit(r.state); hSuccess();
      setCheer((c) => c + 1);
      const swarm = (s.bees.length ? s.bees : ["zhuzha"]);
      flyReward(from, { honey: r.amount }, s, [0, 1, 2].map((k) => swarm[k % swarm.length]));
    },
    comb: (slot: number) => {
      if (!s) return false;
      const n = combAction(s, slot, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    upgrade: (id: UpgradeId) => {
      if (!s) return false;
      const n = buyUpgrade(s, id, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    unlock: (id: string) => {
      if (!s) return false;
      const n = unlockBee(s, id, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    rename: (id: string, name: string) => {
      const cur = sRef.current;
      if (!cur) return false;
      const n = renameBee(cur, id, name);
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    levelUp: (id: string) => {
      if (!s) return false;
      const n = levelUpBee(s, id, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    plant: (bed: number, flower: string) => {
      if (!s) return false;
      const n = plantFlower(s, bed, flower, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    water: (bed: number) => {
      if (!s) return false;
      const n = waterBedAction(s, bed, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    waterAll: () => {
      if (!s) return false;
      const r = waterAllAction(s, Date.now());
      if (!r) { hError(); return false; }
      commit(r.state); hSuccess();
      return true;
    },
    harvest: (bed: number, from: Pt | null) => {
      if (!s) return false;
      const r = harvestAction(s, bed, Date.now());
      if (!r) return false;
      commit(r.state); hSuccess();
      flyReward(from, { nectar: r.nectar }, s, [s.bees[bed % s.bees.length] ?? "zhuzha"]);
      return true;
    },
    unlockBed: () => {
      if (!s) return false;
      const n = unlockBed(s, Date.now());
      if (!n) { hError(); return false; }
      commit(n); hSuccess();
      return true;
    },
    gardenIntroDone: () => {
      const cur = sRef.current;
      if (cur) commit({ ...cur, settings: { ...cur.settings, gardenIntroDone: true } });
    },
    gardenReminders: (on: boolean) => {
      const cur = sRef.current;
      if (cur) commit({ ...cur, settings: { ...cur.settings, gardenReminders: on } });
    },
    login: (from: Pt | null) => {
      if (!s) return;
      const r = claimLogin(s, Date.now());
      setShowLogin(false);
      if (!r) return;
      commit(r.state); hSuccess();
      setTimeout(() => flyReward(from, r.reward, s), 120);
    },
    task: (id: string, from: Pt | null) => {
      if (!s) return;
      const r = claimTask(s, id);
      if (!r) return;
      commit(r.state); hSuccess();
      flyReward(from, r.reward, s);
    },
    bonus: (from: Pt | null) => {
      if (!s) return;
      const r = claimBonus(s);
      if (!r) return;
      commit(r.state); hSuccess();
      flyReward(from, r.reward, s);
    },
    notifications: async (on: boolean) => {
      const cur = sRef.current;
      if (!cur) return;
      if (!on) {
        const n = { ...cur, settings: { ...cur.settings, notifications: false, notifPromptDismissed: true } };
        commit(n);
        applyPlan([]).catch(() => {});
        return;
      }
      let p: "granted" | "denied" | "blocked" = "denied";
      try { p = await requestPermission(); } catch { /* web / unsupported */ }
      setNotifBlocked(p === "blocked");
      if (p === "blocked") Linking.openSettings().catch(() => {});
      if (p !== "granted") return;
      const c2 = sRef.current!;
      commit({ ...c2, settings: { ...c2.settings, notifications: true, notifPromptDismissed: true } });
    },
    dismissNotifPrompt: () => {
      const cur = sRef.current;
      if (cur) commit({ ...cur, settings: { ...cur.settings, notifPromptDismissed: true } });
    },
    haptics: (on: boolean) => {
      const cur = sRef.current;
      if (!cur) return;
      setHaptics(on);
      commit({ ...cur, settings: { ...cur.settings, haptics: on } });
    },
    tutorialDone: () => {
      const cur = sRef.current;
      setShowTutorial(false);
      if (!cur) return;
      const n = { ...cur, settings: { ...cur.settings, tutorialDone: true } };
      commit(n);
      if (canClaimLogin(n, Date.now())) setTimeout(() => setShowLogin(true), 350);
    },
    reset: () => {
      const n = newState(Date.now());
      commit(n);
      setShowSettings(false);
      setTab("hive");
      setHaptics(true);
      applyPlan([]).catch(() => {});
      setTimeout(() => setShowTutorial(true), 300);
    },
    play: (mode: "daily" | "free") => {
      if (!s) return;
      const seed = mode === "daily" ? dailySeed(todayOf(s, Date.now())) : (Date.now() ^ 0x5bd1e995) >>> 0;
      setGame({ mode, seed, key: Date.now() });
    },
    finish: (r: RoundSummary): RoundReward => {
      const cur = sRef.current!;
      const res = finishRound(cur, r, Date.now());
      commit(res.state);
      pendingFly.current = { honey: res.reward.honey, jelly: res.reward.jelly };
      setHold({ honey: cur.honey, jelly: cur.jelly });
      return res.reward;
    },
    exitGame: () => {
      setGame(null);
      const pf = pendingFly.current;
      pendingFly.current = null;
      const cur = sRef.current;
      if (!pf || !cur) { setHold({}); return; }
      const prev = { ...cur, honey: cur.honey - (pf.honey ?? 0), jelly: cur.jelly - (pf.jelly ?? 0) };
      setTimeout(() => flyReward({ x: Dimensions.get("window").width / 2, y: Dimensions.get("window").height * 0.45 }, pf, prev).then(() => {
        if (!pf.honey) setHold((h) => ({ ...h, honey: undefined }));
        if (!pf.jelly) setHold((h) => ({ ...h, jelly: undefined }));
      }), 250);
    },
  };

  useEffect(() => {
    if (s) setHaptics(s.settings.haptics);
  }, [s?.settings.haptics]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  if (game) {
    const b = boostsFor(s.bees, s.beeLevels);
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="dark" />
        <GameScreen
          key={game.key}
          mode={game.mode}
          seed={game.seed}
          moves={game.mode === "daily" ? DAILY_MOVES : freeMoves(s)}
          rules={rulesFor(game.mode, b, dayColorInfo(s, now).active ? dayColorInfo(s, now).color : null)}
          best={game.mode === "daily" ? s.daily.results[todayOf(s, now)]?.score ?? 0 : s.stats.bestScore}
          title={game.mode === "daily" ? "Головоломка дня" : "Свободная игра"}
          onFinish={act.finish}
          onExit={act.exitGame}
          onReplay={() => { setHold({}); pendingFly.current = null; act.play(game.mode); }}
          beeIds={s.bees}
          beeLevels={s.beeLevels}
        />
      </View>
    );
  }

  const loginIdx = nextLoginIndex(s, now);
  const tasksReady = taskBadge(s);
  const showNotifPrompt = NOTIFICATIONS_SUPPORTED && !s.settings.notifications && !s.settings.notifPromptDismissed && s.stats.rounds >= 1;
  const gardenBadge = s.garden.beds.some((b) => isReady(b) || (canWater(b) && b.water <= 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pill icon={ART.honey} value={hold.honey ?? s.honey} bump={bump.honey} label="Мёд" onLayoutIcon={(r) => { honeyIcon.current = r; }} />
        <Pill icon={ART.jelly} value={hold.jelly ?? s.jelly} bump={bump.jelly} label="Маточное молочко" color="#7B52C2" onLayoutIcon={(r) => { jellyIcon.current = r; }} />
        <Pill icon={ART.nectar} value={hold.nectar ?? s.nectar} bump={bump.nectar} label="Нектар" color="#B03A68" onLayoutIcon={(r) => { nectarIcon.current = r; }} />
        <View style={{ flex: 1 }} />
        <View style={styles.lvl} accessibilityLabel={`Уровень улья ${level(s)}`}><Text style={[F.black, { color: "#fff", fontSize: 15, transform: [{ rotate: "-45deg" }] }]}>{level(s)}</Text></View>
        <Press onPress={() => setShowSettings(true)} style={styles.gear} accessibilityRole="button" accessibilityLabel="Настройки">
          <Image source={ART.gear} style={{ width: 22, height: 22, tintColor: C.brown }} />
        </Press>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "hive" ? (
          <View style={{ flex: 1 }}>
          <View style={styles.seg} accessibilityRole="tablist">
            {(["hive", "garden"] as const).map((v) => (
              <Press key={v} onPress={() => setHiveView(v)} style={[styles.segBtn, hiveView === v && styles.segOn]} scaleTo={0.96}
                accessibilityRole="tab" accessibilityLabel={v === "hive" ? "Соты" : "Сад"} accessibilityState={{ selected: hiveView === v }}>
                <Image source={v === "hive" ? ART.tabHive : ART.seed} style={{ width: 18, height: 18, tintColor: hiveView === v ? "#fff" : "#C49A62" }} />
                <Text style={[F.black, { fontSize: 14, color: hiveView === v ? "#fff" : "#A07A4C" }]}>{v === "hive" ? "Соты" : "Сад"}</Text>
                {v === "garden" && (gardenBadge || !s.settings.gardenIntroDone) ? <View style={[styles.badge, { top: 4, right: 10 }]} /> : null}
              </Press>
            ))}
          </View>
          {hiveView === "garden" ? (
            <GardenScreen s={s} now={now} onPlant={act.plant} onWater={act.water} onWaterAll={act.waterAll} onHarvest={act.harvest}
              onUnlockBed={act.unlockBed} onIntroDone={act.gardenIntroDone} />
          ) : (
          <HiveScreen
            s={s} now={now}
            onCollect={act.collect} onComb={act.comb} onUpgrade={act.upgrade} cheer={cheer}
            banner={showNotifPrompt ? (
              <View style={[styles.banner, shadow]}>
                <Image source={ART.clock} style={{ width: 26, height: 26, tintColor: C.honeyDeep }} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">Напомнить, когда улей полон?</Txt>
                  <Txt v="small" color={C.dim}>И когда готова новая головоломка дня.</Txt>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <GameButton small title="Включить" color="green" onPress={() => act.notifications(true)} style={{ flex: 1 }} />
                    <GameButton small title="Не сейчас" color="white" onPress={act.dismissNotifPrompt} style={{ flex: 1 }} />
                  </View>
                </View>
              </View>
            ) : null}
          />
          )}
          </View>
        ) : tab === "puzzle" ? (
          <PuzzleScreen s={s} now={now} onPlay={act.play} />
        ) : tab === "bees" ? (
          <BeesScreen s={s} onUnlock={act.unlock} onLevelUp={act.levelUp} onRename={act.rename} onGarden={() => { setTab("hive"); setHiveView("garden"); }} />
        ) : (
          <TasksScreen s={s} now={now} onClaimLogin={act.login} onClaimTask={act.task} onClaimBonus={act.bonus} onNotifications={act.notifications} notifBlocked={notifBlocked} />
        )}
      </View>

      {/* tab bar */}
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t) => {
          const on = tab === t.id;
          const badge = t.id === "tasks" ? tasksReady || canClaimLogin(s, now) : t.id === "puzzle" ? !s.daily.results[todayOf(s, now)]?.stars : t.id === "hive" ? (s.hive.stored >= 1 && s.hive.stored >= 0.999 * capOf(s)) || gardenBadge : false;
          return (
            <Press key={t.id} onPress={() => setTab(t.id)} style={styles.tab} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} scaleTo={0.9}>
              <View style={[styles.tabIcon, on && styles.tabIconOn]}>
                <TabIcon id={t.id} on={on} />
                {badge ? <View style={styles.badge} /> : null}
              </View>
              <Text style={[F.xbold, { fontSize: 11, color: on ? C.honeyDark : "#B08C5E", marginTop: 2 }]} numberOfLines={1}>{t.label}</Text>
            </Press>
          );
        })}
      </View>

      <Tutorial visible={showTutorial} onDone={act.tutorialDone} />
      <LoginModal visible={showLogin && !showTutorial} index={loginIdx} reward={loginReward(loginIdx, level(s))} streak={s.login.lastDay === todayOf(s, now) - 1 ? s.login.streak : 0}
        onClaim={act.login} onClose={() => setShowLogin(false)} />
      <SettingsModal
        visible={showSettings}
        notifications={s.settings.notifications}
        gardenReminders={s.settings.gardenReminders}
        onGardenReminders={act.gardenReminders}
        haptics={s.settings.haptics}
        notifBlocked={notifBlocked}
        onNotifications={act.notifications}
        onHaptics={act.haptics}
        onTutorial={() => { setShowSettings(false); setTimeout(() => setShowTutorial(true), 250); }}
        onReset={act.reset}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

function taskBadge(s: GameState) {
  const ts = tasksForDay(s.tasks.day);
  const ready = ts.some((t) => !s.tasks.claimed.includes(t.id) && (s.tasks.progress[t.id] ?? 0) >= t.target);
  return ready || (!s.tasks.bonus && s.tasks.claimed.length >= 3);
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  lvl: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }], marginRight: 4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  tabs: { flexDirection: "row", backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 8, ...shadow, shadowOffset: { width: 0, height: -3 }, elevation: 12 },
  tab: { flex: 1, alignItems: "center" },
  tabIcon: { width: 54, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabIconOn: { backgroundColor: C.honey },
  badge: { position: "absolute", top: 2, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 2, borderColor: "#fff" },
  banner: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 22, padding: 14 },
  seg: { flexDirection: "row", marginHorizontal: 16, marginTop: 4, marginBottom: 2, backgroundColor: "#F6E3BF", borderRadius: 18, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 36, borderRadius: 14 },
  segOn: { backgroundColor: C.honeyDeep },
});
