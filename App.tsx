import { t } from "./src/i18n";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Dimensions, Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  GameState, buyUpgrade, canClaimLogin, claimBonus, claimLogin, claimTask, collectHive, combAction, finishRound, freeMoves,
  level, newState, nextLoginIndex, RoundReward, RoundSummary, tick, unlockBee,
  RoundBoosters, RoundMode, startFreeRound, useShuffle, openBox, openAllBoxes, claimWeekly, buyFreeze, assembleNightBee,
  shopBuyItem, shopBuyBooster, shopBuyFragment, setSkin, toggleDeco, currentTasks,
  dayColorInfo, harvestAction, levelUpBee, renameBee, plantFlower, unlockBed, waterAllAction, waterBedAction,
} from "./src/logic/game";
import { canWater, isReady } from "./src/logic/garden";
import { boostsFor, rulesFor } from "./src/logic/bees";
import { dailySeed, DAILY_MOVES, weekendSeed, WEEKEND_MOVES } from "./src/logic/day";
import { BoxKind } from "./src/logic/loot";
import { adoptImported, decodeSave, encodeSave } from "./src/logic/saveCode";
import { inviteFriend } from "./src/platform/share";
import LootScreen from "./src/screens/LootScreen";
import BoxOpen from "./src/screens/BoxOpen";
import { loginReward, Reward } from "./src/logic/tasks";
import { UpgradeId } from "./src/logic/economy";
import { planNotifications } from "./src/logic/notifyPlan";
import { today as todayOf, cap as capOf } from "./src/logic/game";
import { flushCloud, loadState, saveState } from "./src/ui/store";
import { addBackListener, dispatchBack } from "./src/platform/back";
import { useInsets } from "./src/platform/insets";
import { pinArt } from "./src/platform/pinArt";
import { hideBootScreen, initTelegram, NOTIFICATIONS_SUPPORTED, onHide, setBackButton, telegramLanguage } from "./src/platform/telegram";
import { applyPlan, ensureChannel, getPermission, requestPermission } from "./src/ui/notifications";
import { hError, hSuccess, setHaptics } from "./src/ui/haptics";
import { ART } from "./src/ui/art";
import { TabIcon } from "./src/ui/TabIcon";
import { Mascot } from "./src/ui/BeeSprite";
import { C, F, shadow } from "./src/ui/theme";
import { Bar, GameButton, Pill, Press, Txt } from "./src/ui/components";
import { centerOf, FlyProvider, Pt, useFly } from "./src/ui/Fly";
import HiveScreen from "./src/screens/HiveScreen";
import PuzzleScreen from "./src/screens/PuzzleScreen";
import BeesScreen from "./src/screens/BeesScreen";
import TasksScreen from "./src/screens/TasksScreen";
import GardenScreen from "./src/screens/GardenScreen";
import GameScreen from "./src/screens/GameScreen";
import { LoginModal, Tutorial, WhatsNew } from "./src/screens/Modals";
import { SettingsModal } from "./src/screens/Settings";
import LanguagePicker from "./src/screens/LanguagePicker";
import { Lang, setLang } from "./src/i18n";
import { chooseLanguage, setSetting, Settings } from "./src/logic/game";
import { compareVersions } from "./src/logic/update";
import { useUpdater } from "./src/ui/useUpdater";
import { APP_VERSION } from "./src/version";
import BeePreviewScreen from "./src/screens/BeePreviewScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});
pinArt();          // web: keep all art in memory so remounts never refetch (no-op on Android)
initTelegram(C.bg); // web inside Telegram: ready/expand/fullscreen, no swipe-to-close, header colour

type Tab = "hive" | "puzzle" | "bees" | "loot" | "tasks";
const TABS: { id: Tab; label: string; icon: number }[] = [
  { id: "hive", get label() { return t("tab.hive"); }, icon: ART.tabHive },
  { id: "puzzle", get label() { return t("tab.puzzle"); }, icon: ART.tabPuzzle },
  { id: "bees", get label() { return t("tab.bees"); }, icon: ART.tabBee },
  { id: "loot", get label() { return t("tab.loot"); }, icon: ART.tabBox },
  { id: "tasks", get label() { return t("tab.tasks"); }, icon: ART.tabTasks },
];

export default function App() {
  const preview = Platform.OS === "web" && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("beePreview") === "1";
  return (
    <SafeAreaProvider>
      <FlyProvider>
        {preview ? <BeePreviewScreen /> : <Main />}
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
  const [game, setGame] = useState<{ mode: RoundMode; seed: number; key: number; extraMoves: number; bomb: boolean } | null>(null);
  const [boxOpen, setBoxOpen] = useState<BoxKind | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPage, setSettingsPage] = useState<"main" | "update">("main");
  const [showWhatsNew, setShowWhatsNew] = useState(false);
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
  const updater = useUpdater(s?.settings.autoUpdate ?? false, !!s);

  /** after the language is known: tutorial (new players) → "What's new" (after a version change) → login reward */
  const afterLanguage = (st: GameState) => {
    if (!st.settings.tutorialDone) { setShowTutorial(true); return; }
    if (compareVersions(st.settings.lastVersion, APP_VERSION) < 0) { setShowWhatsNew(true); return; }
    if (canClaimLogin(st, Date.now())) setShowLogin(true);
  };

  /** Replace state; persist now (actions) or at most every 15 s (ticks). */
  const commit = useCallback((next: GameState, force = true) => {
    setLang(next.settings.lang);
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
      if (st.settings.langPicked) afterLanguage(st);
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
      if (boxOpen) return false; // BoxOpen handles its own back
      if (showSettings) { setShowSettings(false); return true; }
      if (showLogin) { setShowLogin(false); return true; }
      if (tab !== "hive") { setTab("hive"); return true; }
      if (hiveView !== "hive") { setHiveView("hive"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [game, boxOpen, showSettings, showLogin, tab, hiveView]);
  // Telegram's BackButton mirrors in-app navigation (hidden on the home screen)
  const canBack = !!game || !!boxOpen || showSettings || showLogin || tab !== "hive" || hiveView !== "hive";
  useEffect(() => setBackButton(canBack, () => { dispatchBack(); }), [canBack]);

  // ----- reward flight to the currency pills -----
  const flyReward = useCallback(async (from: Pt | null, r: Reward & { nectar?: number }, prev: GameState, bees?: string[]) => {
    const tasks: Promise<void>[] = [];
    const run = async (kind: "honey" | "jelly" | "nectar", amount: number | undefined) => {
      if (!amount) return;
      setHold((h) => ({ ...h, [kind]: prev[kind] })); // keep the pill at the old value until the drops land
      const to = await centerOf((kind === "jelly" ? jellyIcon.current : kind === "nectar" ? nectarIcon.current : null) ?? honeyIcon.current);
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
    /** v1.4: language picker confirmed */
    pickLang: (l: Lang) => {
      const cur = sRef.current;
      if (!cur) return;
      const n = chooseLanguage(cur, l);
      commit(n);
      setTimeout(() => afterLanguage(n), 200);
    },
    lang: (l: Lang) => {
      const cur = sRef.current;
      if (cur && cur.settings.lang !== l) commit(chooseLanguage(cur, l));
    },
    setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => {
      const cur = sRef.current;
      if (!cur) return;
      if (k === "haptics") setHaptics(v as boolean);
      commit(setSetting(cur, k, v));
    },
    whatsNewDone: () => {
      setShowWhatsNew(false);
      const cur = sRef.current;
      if (cur) commit(setSetting(cur, "lastVersion", APP_VERSION));
      if (cur && canClaimLogin(cur, Date.now())) setTimeout(() => setShowLogin(true), 300);
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
      const cur = sRef.current;
      const fresh = newState(Date.now());
      // a reset keeps the chosen language and the silent early-player mark
      const n = cur ? { ...fresh, early: cur.early, settings: { ...fresh.settings, lang: cur.settings.lang, langPicked: true } } : fresh;
      commit(n);
      setShowSettings(false);
      setTab("hive");
      setHaptics(true);
      applyPlan([]).catch(() => {});
      setTimeout(() => setShowTutorial(true), 300);
    },
    play: (mode: RoundMode, boosters?: RoundBoosters) => {
      const cur = sRef.current;
      if (!cur) return;
      const d = todayOf(cur, Date.now());
      const seed = mode === "daily" ? dailySeed(d) : mode === "weekend" ? weekendSeed(d) : (Date.now() ^ 0x5bd1e995) >>> 0;
      let extraMoves = 0, bomb = false;
      if (mode === "free" && boosters && (boosters.moves || boosters.bomb)) {
        const r = startFreeRound(cur, boosters);
        commit(r.state); extraMoves = r.extraMoves; bomb = r.bomb;
      }
      setGame({ mode, seed, key: Date.now(), extraMoves, bomb });
    },
    shuffle: () => {
      const cur = sRef.current;
      const n = cur && useShuffle(cur);
      if (!n) return false;
      commit(n); return true;
    },
    openBox: (kind: BoxKind) => {
      const cur = sRef.current;
      const r = cur && openBox(cur, kind, Date.now());
      if (!r) { hError(); return null; }
      commit(r.state); return r.drops;
    },
    openAll: (kind: BoxKind) => {
      const cur = sRef.current;
      const r = cur && openAllBoxes(cur, kind, Date.now());
      if (!r) { hError(); return null; }
      commit(r.state); return r.drops;
    },
    simple: (f: (cur: GameState) => GameState | null) => {
      const cur = sRef.current;
      const n = cur && f(cur);
      if (!n) { hError(); return false; }
      commit(n); hSuccess(); return true;
    },
    weekly: (from: Pt | null) => {
      const cur = sRef.current;
      const n = cur && claimWeekly(cur, Date.now());
      if (!n) return;
      commit(n); hSuccess();
      flyReward(from, { jelly: n.jelly - cur!.jelly }, cur!);
    },
    importCode: (code: string): string | null => {
      const cur = sRef.current;
      if (!cur) return t("c.loading");
      const r = decodeSave(code, Date.now());
      if (!r.ok) { hError(); return r.error; }
      const n = tick(adoptImported(cur, r.state), Date.now());
      commit(n); hSuccess(); setHaptics(n.settings.haptics);
      return null;
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
          moves={game.mode === "daily" ? DAILY_MOVES : game.mode === "weekend" ? WEEKEND_MOVES : freeMoves(s) + game.extraMoves}
          startBomb={game.bomb}
          shuffles={game.mode === "free" ? s.loot.boosters.shuffle : 0}
          onShuffle={act.shuffle}
          rules={rulesFor(game.mode === "free" ? "free" : "daily", b, dayColorInfo(s, now).active ? dayColorInfo(s, now).color : null)}
          best={game.mode === "daily" ? s.daily.results[todayOf(s, now)]?.score ?? 0 : game.mode === "weekend" ? s.week.weekendBest : s.stats.bestScore}
          title={t(game.mode === "daily" ? "mode.daily" : game.mode === "weekend" ? "mode.weekend" : "mode.free")}
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
    <View key={s.settings.lang} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pill icon={ART.honey} value={hold.honey ?? s.honey} bump={bump.honey} label={t("c.honey")} onLayoutIcon={(r) => { honeyIcon.current = r; }} />
        {/* v1.5: top bar shows honey only; jelly/nectar live on the screens that use them */}
        <View style={{ flex: 1 }} />
        <Press onPress={() => { setSettingsPage("main"); setShowSettings(true); }} style={styles.gear} accessibilityRole="button" accessibilityLabel={updater.available ? `${t("c.settings")} · ${t("up.badge")}` : t("c.settings")}>
          <Image source={ART.gear} style={{ width: 22, height: 22, tintColor: C.brown }} />
          {updater.available ? <View style={[styles.badge, { top: -1, right: -1 }]} /> : null}
        </Press>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "hive" ? (
          <View style={{ flex: 1 }}>
          <View style={styles.seg} accessibilityRole="tablist">
            {(["hive", "garden"] as const).map((v) => (
              <Press key={v} onPress={() => setHiveView(v)} style={[styles.segBtn, hiveView === v && styles.segOn]} scaleTo={0.96}
                accessibilityRole="tab" accessibilityLabel={t(v === "hive" ? "seg.combs" : "seg.garden")} accessibilityState={{ selected: hiveView === v }}>
                <Image source={v === "hive" ? ART.tabHive : ART.seed} style={{ width: 18, height: 18, tintColor: hiveView === v ? "#fff" : "#C49A62" }} />
                <Text style={[F.black, { fontSize: 14, color: hiveView === v ? "#fff" : "#A07A4C" }]}>{t(v === "hive" ? "seg.combs" : "seg.garden")}</Text>
                {v === "garden" && (gardenBadge || !s.settings.gardenIntroDone) ? <View style={[styles.badge, { top: 4, right: 10 }]} /> : null}
              </Press>
            ))}
          </View>
          {hiveView === "hive" ? (
            <Press onPress={() => setTab("tasks")} style={[styles.zcard, shadow]} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={t("hv.today", { a: Math.min(3, s.tasks.claimed.length), b: 3 })}>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t("hv.today", { a: Math.min(3, s.tasks.claimed.length), b: 3 })}</Txt>
                <Bar progress={Math.min(1, s.tasks.claimed.length / 3)} height={8} color={C.green} style={{ marginTop: 6 }} />
                <Txt v="tiny" color={C.honeyDark} style={{ marginTop: 4 }}>{t("hv.allTasks")} ›</Txt>
              </View>
              <Mascot size={58} />
            </Press>
          ) : null}
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
                  <Txt v="h3">{t("prompt.title")}</Txt>
                  <Txt v="small" color={C.dim}>{t("prompt.sub")}</Txt>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <GameButton small title={t("prompt.on")} color="green" onPress={() => act.notifications(true)} style={{ flex: 1 }} />
                    <GameButton small title={t("prompt.later")} color="white" onPress={act.dismissNotifPrompt} style={{ flex: 1 }} />
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
          <BeesScreen s={s} onSkin={(bee, k) => act.simple((c) => setSkin(c, bee, k))} onAssemble={() => act.simple((c) => assembleNightBee(c, Date.now()))} onUnlock={act.unlock} onLevelUp={act.levelUp} onRename={act.rename} onGarden={() => { setTab("hive"); setHiveView("garden"); }} />
        ) : tab === "loot" ? (
          <LootScreen s={s} now={now}
            onOpenBox={(k) => setBoxOpen(k)}
            onClaimWeekly={act.weekly}
            onBuyFreeze={() => act.simple((c) => buyFreeze(c, Date.now()))}
            onPlayWeekend={() => act.play("weekend")}
            onAssemble={() => act.simple((c) => assembleNightBee(c, Date.now()))}
            onBuyItem={(id) => act.simple((c) => shopBuyItem(c, id))}
            onBuyBooster={(bid) => act.simple((c) => shopBuyBooster(c, bid))}
            onBuyFragment={() => act.simple((c) => shopBuyFragment(c))}
            onToggleDeco={(id) => act.simple((c) => toggleDeco(c, id))}
          />
        ) : (
          <TasksScreen s={s} now={now} onClaimWeekly={act.weekly} onBuyFreeze={() => act.simple((c) => buyFreeze(c, Date.now()))} onClaimLogin={act.login} onClaimTask={act.task} onClaimBonus={act.bonus} onNotifications={act.notifications} notifBlocked={notifBlocked} />
        )}
      </View>

      {/* tab bar */}
      <View style={[styles.tabs, { marginBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t) => {
          const on = tab === t.id;
          const badge = t.id === "loot" ? s.loot.boxes.wood + s.loot.boxes.wax + s.loot.boxes.gold > 0 || (!s.week.chest && s.week.tasks >= 15) : t.id === "tasks" ? tasksReady || canClaimLogin(s, now) : t.id === "puzzle" ? !s.daily.results[todayOf(s, now)]?.stars : t.id === "hive" ? (s.hive.stored >= 1 && s.hive.stored >= 0.999 * capOf(s)) || gardenBadge : false;
          return (
            <Press key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} scaleTo={0.9}>
              <View style={styles.tabIcon}>
                <TabIcon id={t.id} on={on} />
                {badge ? <View style={styles.badge} /> : null}
              </View>
              <Text style={[F.xbold, { fontSize: 11, color: on ? "#5A3200" : "#B08C5E", marginTop: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.label}</Text>
            </Press>
          );
        })}
      </View>

      <Tutorial visible={showTutorial && s.settings.langPicked} onDone={act.tutorialDone} />
      <LoginModal visible={showLogin && !showTutorial && !showWhatsNew && s.settings.langPicked} index={loginIdx} reward={loginReward(loginIdx, level(s))} streak={s.login.lastDay === todayOf(s, now) - 1 ? s.login.streak : 0}
        onClaim={act.login} onClose={() => setShowLogin(false)} />
      <SettingsModal
        visible={showSettings}
        startPage={settingsPage}
        s={s}
        notifBlocked={notifBlocked}
        updater={updater}
        onSet={act.setSetting}
        onLang={act.lang}
        onNotifications={act.notifications}
        onTutorial={() => { setShowSettings(false); setTimeout(() => setShowTutorial(true), 250); }}
        onWhatsNew={() => { setShowSettings(false); setTimeout(() => setShowWhatsNew(true), 250); }}
        onReset={act.reset}
        onInvite={() => { inviteFriend().catch(() => {}); }}
        onClose={() => setShowSettings(false)}
        getCode={() => encodeSave(sRef.current ?? s)}
        onImport={act.importCode}
      />
      <WhatsNew visible={showWhatsNew} version={APP_VERSION} onClose={act.whatsNewDone} />
      {!s.settings.langPicked ? (
        <LanguagePicker initial={s.settings.lang !== "en" ? s.settings.lang : telegramLanguage() ?? "en"} suggested={telegramLanguage()} onDone={act.pickLang} />
      ) : null}
      {boxOpen ? (
        <BoxOpen key={boxOpen} kind={boxOpen} left={s.loot.boxes[boxOpen]} bees={s.bees} skins={s.beeSkins}
          onOpen={() => act.openBox(boxOpen)} onOpenAll={() => act.openAll(boxOpen)} onClose={() => setBoxOpen(null)} />
      ) : null}
    </View>
  );
}

function taskBadge(s: GameState) {
  const ts = currentTasks(s);
  const ready = ts.some((t) => !s.tasks.claimed.includes(t.id) && (s.tasks.progress[t.id] ?? 0) >= t.target);
  return ready || (!s.tasks.bonus && s.tasks.claimed.length >= 3);
}

const styles = StyleSheet.create({
  zcard: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 6, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 20, backgroundColor: "#FFE7A8" },
  top: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  lvl: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }], marginRight: 4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  tabs: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 26, marginHorizontal: 10, padding: 6, gap: 2, ...shadow, shadowOffset: { width: 0, height: 3 }, elevation: 12 },
  tab: { flex: 1, alignItems: "center", borderRadius: 20, paddingVertical: 6 },
  tabOn: { backgroundColor: C.honey, ...shadow, elevation: 4 },
  tabIcon: { width: 40, height: 30, alignItems: "center", justifyContent: "center" },
  tabIconOn: { backgroundColor: C.honey },
  badge: { position: "absolute", top: 2, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 2, borderColor: "#fff" },
  banner: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 22, padding: 14 },
  seg: { flexDirection: "row", marginHorizontal: 16, marginTop: 4, marginBottom: 2, backgroundColor: "#F6E3BF", borderRadius: 18, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 36, borderRadius: 14 },
  segOn: { backgroundColor: C.honeyDeep },
});
