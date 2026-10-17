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
  eventIntroDue, eventIntroSeen, eventView,
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
import { ART, sceneBg, seasonalTiles, setTileStyle } from "./src/ui/art";
import { SceneBg } from "./src/ui/SceneBg";
import { TabIcon } from "./src/ui/TabIcon";
import { Mascot } from "./src/ui/BeeSprite";
import { C, F, shadow, K, themed, resolveTheme, setTheme, themeName, isNight } from "./src/ui/theme";
import { Bar, GameButton, Pill, Press, TopPad, Txt } from "./src/ui/components";
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
import { activeEvent, forceEvent, isAutumn, PUMPKIN_CHANCE } from "./src/logic/event";
import { claimTrackStep, finishFlight, flightRunsToday, treatGuest } from "./src/logic/game";
import { EventIntro, JackCarved, TrickBanner } from "./src/screens/EventTrack";
import { FLIGHT_PAID_RUNS } from "./src/logic/nightFlight";
import FlightScreen from "./src/screens/FlightScreen";
import { useUpdater } from "./src/ui/useUpdater";
import { APP_VERSION, DEV_BUILD } from "./src/version";

SplashScreen.preventAutoHideAsync().catch(() => {});
// web previews / screenshots: `?event=1` runs the seasonal event outside its dates; `?dev=1` shows the dev switches
const webQuery = Platform.OS === "web" && typeof window !== "undefined" ? window.location?.search ?? "" : "";
const WEB_EVENT = /[?&]event=1(&|$)/.test(webQuery);
const DEV = DEV_BUILD || /[?&]dev=1(&|$)/.test(webQuery);
if (WEB_EVENT) forceEvent(true);
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
  const [lootSeg, setLootSeg] = useState<"chests" | "shop" | "album">("chests");
  const [flight, setFlight] = useState<{ key: number; seed: number; bee: string } | null>(null);
  const [game, setGame] = useState<{ mode: RoundMode; seed: number; key: number; extraMoves: number; bomb: boolean } | null>(null);
  const [boxOpen, setBoxOpen] = useState<BoxKind | null>(null);
  const [jack, setJack] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [topH, setTopH] = useState(0);
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
    if (DEV && !WEB_EVENT) forceEvent(next.settings.devEvent); // dev switch: Halloween on / normal
    setTileStyle(seasonalTiles(next.settings.tiles, !!activeEvent(todayOf(next, Date.now()))));
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
      if (game || flight) return false; // GameScreen / FlightScreen handle their own back
      if (boxOpen) return false; // BoxOpen handles its own back
      if (showSettings) return false; // SettingsModal handles its own back (sub-page → main → close)
      if (showLogin) { setShowLogin(false); return true; }
      if (tab !== "hive") { setTab("hive"); return true; }
      if (hiveView !== "hive") { setHiveView("hive"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [game, flight, boxOpen, showSettings, showLogin, tab, hiveView]);
  // Telegram's BackButton mirrors in-app navigation (hidden on the home screen)
  const canBack = !!game || !!flight || !!boxOpen || showSettings || showLogin || tab !== "hive" || hiveView !== "hive";
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
      if (r.jack) setTimeout(() => setJack(r.jack!), 900);
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
    treat: (from: Pt | null) => {
      if (!s) return;
      const r = treatGuest(s, Date.now());
      if (!r) return;
      commit(r.state); hSuccess();
      if (r.reward.honey || r.reward.jelly) flyReward(from, { honey: r.reward.honey, jelly: r.reward.jelly }, s);
    },
    track: (from: Pt | null) => {
      if (!s) return;
      const r = claimTrackStep(s, Date.now());
      if (!r) return;
      commit(r.state); hSuccess();
      if (r.reward.honey || r.reward.jelly) flyReward(from, { honey: r.reward.honey, jelly: r.reward.jelly }, s);
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
    flight: () => {
      const cur = sRef.current;
      if (!cur) return;
      // a random bee of the player's flies each run
      setFlight({ key: Date.now(), seed: (Date.now() ^ 0x2c1b3c6d) >>> 0, bee: cur.bees[Math.floor(Math.random() * cur.bees.length)] ?? "zhuzha" });
    },
    finishFlight: (r: { passed: number; candies: number }) => {
      const res = finishFlight(sRef.current!, r, Date.now());
      commit(res.state);
      return res.reward;
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

  // interface theme: set before any child renders (the keyed roots below remount on a change)
  setTheme(resolveTheme(s.settings.ui, !!activeEvent(todayOf(s, now))));
  const themeKey = themeName();

  if (flight) {
    return (
      <View key={themeKey} style={{ flex: 1, backgroundColor: K.bg("#2B1B3D") }}>
        <StatusBar style="light" />
        <FlightScreen key={flight.key} seed={flight.seed} beeId={flight.bee} skin={s.beeSkins[flight.bee]} level={s.beeLevels[flight.bee] ?? 1}
          best={s.flight.best} paidLeft={Math.max(0, FLIGHT_PAID_RUNS - flightRunsToday(s, now))} event={!!activeEvent(todayOf(s, now))}
          onFinish={act.finishFlight} onExit={() => setFlight(null)} onReplay={act.flight} />
      </View>
    );
  }
  if (game) {
    const b = boostsFor(s.bees, s.beeLevels);
    const rules = rulesFor(game.mode === "free" ? "free" : "daily", b, dayColorInfo(s, now).active ? dayColorInfo(s, now).color : null);
    const puzzleNight = !!activeEvent(todayOf(s, now));
    const halloween = game.mode === "free" && puzzleNight;
    return (
      <View key={themeKey} style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style={puzzleNight ? "light" : "dark"} />
        {puzzleNight || isAutumn(todayOf(s, now)) ? <Image source={puzzleNight ? ART.puzzleNight : ART.puzzleAutumn} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} /> : null}
        <GameScreen
          key={game.key}
          mode={game.mode}
          seed={game.seed}
          moves={game.mode === "daily" ? DAILY_MOVES : game.mode === "weekend" ? WEEKEND_MOVES : freeMoves(s) + game.extraMoves}
          startBomb={game.bomb}
          shuffles={game.mode === "free" ? s.loot.boosters.shuffle : 0}
          onShuffle={act.shuffle}
          rules={halloween ? { ...rules, pumpkinChance: PUMPKIN_CHANCE, ghost: true } : rules}
          dayColor={dayColorInfo(s, now)}
          best={game.mode === "daily" ? s.daily.results[todayOf(s, now)]?.score ?? 0 : game.mode === "weekend" ? s.week.weekendBest : s.stats.bestScore}
          title={t(game.mode === "daily" ? "mode.daily" : game.mode === "weekend" ? "mode.weekend" : "mode.free")}
          onFinish={act.finish}
          onExit={act.exitGame}
          onReplay={() => { setHold({}); pendingFly.current = null; act.play(game.mode); }}
          beeIds={s.bees}
          beeLevels={s.beeLevels}
          night={puzzleNight}
        />
      </View>
    );
  }

  const loginIdx = nextLoginIndex(s, now);
  const tasksReady = taskBadge(s);
  const showNotifPrompt = NOTIFICATIONS_SUPPORTED && !s.settings.notifications && !s.settings.notifPromptDismissed && s.stats.rounds >= 1;
  const night = !!activeEvent(todayOf(s, now));
  const gardenBadge = s.garden.beds.some((b) => isReady(b) || (canWater(b) && b.water <= 0));

  return (
    <View key={`${s.settings.lang}-${seasonalTiles(s.settings.tiles, night)}-${themeKey}`} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={night && tab === "hive" ? "light" : "dark"} />
      {tab === "hive" ? (
        <SceneBg source={sceneBg(hiveView === "garden" ? "garden" : "hive", night, isAutumn(todayOf(s, now)))} />
      ) : null}
      <TopPad.Provider value={topH}>
      <View style={{ flex: 1 }}>
        {tab === "hive" ? (
          <View style={{ flex: 1 }}>
          {hiveView === "garden" ? (
            <GardenScreen s={s} now={now} onPlant={act.plant} onWater={act.water} onWaterAll={act.waterAll} onHarvest={act.harvest}
              onUnlockBed={act.unlockBed} onIntroDone={act.gardenIntroDone}
              onToggleDeco={(id) => act.simple((c) => toggleDeco(c, id))} onShop={() => { setLootSeg("shop"); setTab("loot"); }} />
          ) : (
          <HiveScreen
            s={s} now={now} night={night}
            onCollect={act.collect} onComb={act.comb} onUpgrade={act.upgrade} cheer={cheer}
            onToggleDeco={(id) => act.simple((c) => toggleDeco(c, id))} onShop={() => { setLootSeg("shop"); setTab("loot"); }}
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
            ) : <TrickBanner s={s} now={now} onTreat={act.treat} />}
          />
          )}
          </View>
        ) : tab === "puzzle" ? (
          <PuzzleScreen s={s} now={now} onPlay={act.play} onBuyBooster={(bid) => act.simple((c) => shopBuyBooster(c, bid))} onClaimTrack={act.track} onFlight={act.flight} />
        ) : tab === "bees" ? (
          <BeesScreen s={s} onSkin={(bee, k) => act.simple((c) => setSkin(c, bee, k))} onAssemble={() => act.simple((c) => assembleNightBee(c, Date.now()))} onUnlock={act.unlock} onLevelUp={act.levelUp} onRename={act.rename} onGarden={() => { setTab("hive"); setHiveView("garden"); }} />
        ) : tab === "loot" ? (
          <LootScreen key={lootSeg} initialSeg={lootSeg} s={s} now={now}
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
          <TasksScreen s={s} now={now} onClaimTrack={act.track} onClaimWeekly={act.weekly} onBuyFreeze={() => act.simple((c) => buyFreeze(c, Date.now()))} onClaimLogin={act.login} onClaimTask={act.task} onClaimBonus={act.bonus} onNotifications={act.notifications} notifBlocked={notifBlocked} />
        )}
      </View>
      </TopPad.Provider>

      {/* top bar: one currency bar + gear, floating over the scene like the tab bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))} pointerEvents="box-none">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} pointerEvents="box-none">
          <View style={styles.cur}>
            <Pill icon={ART.honey} value={hold.honey ?? s.honey} bump={bump.honey} label={t("c.honey")} onLayoutIcon={(r) => { honeyIcon.current = r; }} />
            <Pill icon={ART.nectar} value={hold.nectar ?? s.nectar} bump={bump.nectar} label={t("c.nectar")} color={K.fg("#B03A68")} onLayoutIcon={(r) => { nectarIcon.current = r; }} />
            <Pill icon={ART.jelly} value={hold.jelly ?? s.jelly} bump={bump.jelly} label={t("c.jelly")} color={K.fg("#7B52C2")} onLayoutIcon={(r) => { jellyIcon.current = r; }} />
            <Pill icon={ART.pollen} value={s.loot.pollen} label={t("c.pollen")} color={K.fg("#B07A10")} />
            <Pill icon={ART.fragment} value={s.loot.fragments} label={t("c.fragments")} color={K.fg("#5B5FC7")} />
          </View>
          <Press onPress={() => { setSettingsPage("main"); setShowSettings(true); }} style={styles.gear} accessibilityRole="button" accessibilityLabel={updater.available ? `${t("c.settings")} · ${t("up.badge")}` : t("c.settings")}>
            <Image source={ART.gear} style={{ width: 22, height: 22, tintColor: C.brown }} />
            {updater.available ? <View style={[styles.badge, { top: -1, right: -1 }]} /> : null}
          </Press>
        </View>
        {tab === "hive" ? (
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
        ) : null}
      </View>

      {/* tab bar */}
      <View style={[styles.tabs, { position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 8) }]}>
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
        dev={DEV}
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
      <JackCarved id={jack} onClose={() => setJack(null)} />
      <EventIntro visible={eventIntroDue(s, now) && s.settings.langPicked && s.settings.tutorialDone && !showTutorial && !showWhatsNew && !showLogin}
        daysLeft={eventView(s, now)?.daysLeft ?? 0}
        onClose={() => act.simple((c) => eventIntroSeen(c, Date.now()))}
        onGo={() => { act.simple((c) => eventIntroSeen(c, Date.now())); setTab("puzzle"); }} />
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

const styles = themed(() => StyleSheet.create({
  zcard: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 6, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 22, backgroundColor: K.bg("rgba(255,247,226,0.94)") },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 2 },
  cur: { flex: 1, flexDirection: "row", alignItems: "center", height: 40, paddingHorizontal: 6, gap: 2, borderRadius: 20, backgroundColor: K.bg("#FFFFFF"), ...shadow, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  lvl: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.honeyDeep, alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }], marginRight: 4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: K.bg("#fff"), alignItems: "center", justifyContent: "center", ...shadow, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  tabs: { flexDirection: "row", backgroundColor: K.bg("#FFFFFF"), borderRadius: 26, marginHorizontal: 10, padding: 6, gap: 2, ...shadow, shadowOffset: { width: 0, height: 3 }, elevation: 12, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  tab: { flex: 1, alignItems: "center", borderRadius: 20, paddingVertical: 6 },
  tabOn: { backgroundColor: C.honey, ...shadow, elevation: 4 },
  tabIcon: { width: 40, height: 30, alignItems: "center", justifyContent: "center" },
  tabIconOn: { backgroundColor: C.honey },
  badge: { position: "absolute", top: 2, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 2, borderColor: K.bd("#fff") },
  banner: { flexDirection: "row", gap: 12, backgroundColor: K.bg("#fff"), borderRadius: 22, padding: 14, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  seg: { flexDirection: "row", alignSelf: "center", width: 220, marginTop: 8, marginBottom: 6, backgroundColor: K.bg("rgba(255,255,255,0.92)"), borderRadius: 20, padding: 4, gap: 4, ...shadow },
  segBtn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 36, borderRadius: 14 },
  segOn: { backgroundColor: C.honey },
}));
