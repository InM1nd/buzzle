/** Local art review: uses real sprite and game screens, never loads or writes a save. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { setLang } from "../i18n";
import { GameState, newState } from "../logic/game";
import { ART } from "../ui/art";
import { BeeArtProvider, BeeArtVariant } from "../ui/BeeArtVariant";
import type { ReferenceBeeId } from "../ui/ReferenceBee";
import { BeeSprite, useFace } from "../ui/BeeSprite";
import { _setAnimActive, useCycle } from "../ui/anim";
import { Txt } from "../ui/components";
import { C } from "../ui/theme";
import HiveScreen from "./HiveScreen";
import BeesScreen from "./BeesScreen";

const SKINS = [
  ["", "Без наряда"], ["scarf", "Шарфик"], ["bow", "Бантик"], ["glasses", "Очки"],
  ["backpack", "Сумка"], ["wreath", "Венок"], ["beret", "Берет"],
  ["headphones", "Наушники"], ["halo", "Ореол"],
] as const;
const REFERENCE_BEES = [
  ["zhuzha", "Жужа"], ["pushinka", "Пушинка"], ["boris", "Борис"],
  ["solnyshko", "Солнышко"], ["lavanda", "Лаванда"],
  ["klevera", "Клеверина"], ["vasilek", "Василёк"],
  ["myatka", "Мятка"], ["iskorka", "Искорка"],
  ["sonya", "Соня"], ["zorkaya", "Зоркая"],
  ["margo", "Марго"], ["nochka", "Ночка"],
] as const;
const TURNS = [[0, "Анфас"], [16 / 62, "16°"], [32 / 62, "32°"], [47 / 62, "47°"], [1, "62°"], [-1, "Влево"]] as const;
type Screen = "crowns" | "batch" | "trio" | "compare" | "skins" | "hive" | "collection";

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
    onPress={onPress} style={[styles.choice, selected && styles.selected]}>
    <Txt v="small" color={selected ? "#fff" : C.text}>{label}</Txt>
  </Pressable>;
}

function PreviewBee({ id = "zhuzha", art, size, level, skin, moving, autoTurn, turn, seed = 1 }: {
  id?: ReferenceBeeId; art: BeeArtVariant; size: number; level: number; skin: string; moving: boolean; autoTurn: boolean; turn: number; seed?: number;
}) {
  const face = useFace(moving, seed);
  const clock = useRef(new Animated.Value(0)).current;
  useCycle(clock, 8000, moving && autoTurn);
  const sweep = useMemo(() => clock.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 1, 0, -1, 0] }), [clock]);
  return <BeeSprite id={id} size={size} art={art} level={level} skin={skin || undefined}
    flap={moving} turn={autoTurn && moving ? sweep : turn} face={moving ? face : undefined} seed={seed} />;
}

function ComparisonCard({ art, label, level, skin, moving, autoTurn, turn, large = false }: {
  art: BeeArtVariant; label: string; level: number; skin: string; moving: boolean; autoTurn: boolean; turn: number; large?: boolean;
}) {
  return <View style={styles.card}>
    <View style={[styles.beeBg, large && { height: 300 }]}>
      <PreviewBee {...{ art, level, skin, moving, autoTurn, turn }} size={large ? 280 : 112} />
      <View style={styles.badge}><Txt v="tiny" color="#fff">{level === 10 ? "МАКС" : `ур. ${level}`}</Txt></View>
    </View>
    <Txt v="h3" style={{ marginTop: 8 }}>Жужа</Txt>
    <Txt v="tiny" color="#7E9136">ОБЫЧНАЯ</Txt>
    <Txt v="small" color={C.dim}>+{level}% к мёду улья</Txt>
    <Txt v="tiny" color={C.greenDark} style={{ marginTop: 12 }}>✓ В УЛЬЕ</Txt>
    <Txt v="small" center style={{ marginTop: 12 }}>{label}</Txt>
  </View>;
}

export default function BeePreviewScreen() {
  const [screen, setScreen] = useState<Screen>("skins");
  const [pairBee, setPairBee] = useState<"margo" | "nochka">("margo");
  const [selectedBee, setSelectedBee] = useState<ReferenceBeeId>("pushinka");
  const [borisLevel, setBorisLevel] = useState(10);
  const [borisSkin, setBorisSkin] = useState("backpack");
  const [art, setArt] = useState<BeeArtVariant>("reference");
  const [level, setLevel] = useState(10);
  const [skin, setSkin] = useState("backpack");
  const [moving, setMoving] = useState(true);
  const [autoTurn, setAutoTurn] = useState(false);
  const [large, setLarge] = useState(true);
  const [turn, setTurn] = useState(16 / 62);
  const [cheer, setCheer] = useState(0);
  const [now] = useState(Date.now);
  useEffect(() => { setLang("ru"); SplashScreen.hideAsync().catch(() => {}); }, []);
  useEffect(() => { _setAnimActive(moving); return () => _setAnimActive(true); }, [moving]);
  const s = useMemo<GameState>(() => {
    const base = newState(now);
    const beeSkins: Record<string, string> = Object.fromEntries(REFERENCE_BEES.map(([id]) => [id, id === "boris" ? borisSkin : skin]).filter(([, value]) => value));
    return { ...base, honey: 1240, jelly: 12, nectar: 400,
      bees: ["margo", "nochka", "boris", "zhuzha", "pushinka", "solnyshko", "lavanda", "klevera", "vasilek", "myatka", "iskorka", "sonya", "zorkaya"],
      beeLevels: { zhuzha: level, pushinka: 4, boris: borisLevel, solnyshko: 2, lavanda: 1, klevera: 1, vasilek: 1, myatka: 1, iskorka: 1, sonya: 1, zorkaya: 1, margo: 1, nochka: 1 },
      beeSkins,
      hive: { ...base.hive, combs: base.hive.combs.map((_, i) => [4, 3, 3, 2, 2, 2, 1, 1, 1][i] ?? 0), stored: 1000 },
      upgrades: { workers: 2, storage: 1, flowers: 2, queen: 0 },
      loot: { ...base.loot, owned: SKINS.map(([id]) => id).filter(Boolean) },
    };
  }, [now, level, skin, borisLevel, borisSkin]);
  const shared = { level, skin, moving, autoTurn, turn };
  return <BeeArtProvider value={art}>
    <View style={styles.page}>
      <View style={styles.toolbar}>
        <Txt v="h2">Проверка пчёл</Txt>
        <Txt v="tiny" color={C.dim}>Тестовые данные · тринадцать пчёл в новом стиле</Txt>
        <View style={styles.row}>
          {([["crowns", "Короны"], ["batch", "Новая пара"], ["trio", "Все пчёлы"], ["compare", "Жужа"], ["skins", "Наряды"], ["hive", "Улей"], ["collection", "Коллекция"]] as const).filter(([id]) => art === "reference" || (id !== "trio" && id !== "batch"))
            .map(([id, label]) => <Choice key={id} label={label} selected={screen === id} onPress={() => setScreen(id)} />)}
        </View>
        <View style={styles.row}>
          <Choice label="Спрайт по референсу" selected={art === "reference"} onPress={() => { setArt("reference"); setLevel(10); setSkin(""); setScreen("trio"); }} />
          <Choice label="3D-попытка" selected={art === "honey"} onPress={() => { setArt("honey"); setScreen("compare"); }} />
        </View>
        {art === "reference" ? <>
          <Txt v="small" color={C.dim}>Сумка, берет и бантик одобрены. Венок выровнен по голове без поднятых краёв.</Txt>
          <Choice label={moving ? "Пауза" : "Движение"} selected={!moving} onPress={() => setMoving(!moving)} />
          {(screen === "hive" || screen === "collection" || (screen === "trio" && selectedBee === "boris")) && <>
          <View style={styles.row}>
            {[1, 5, 10].map(n => <Choice key={n} label={`Борис: ур. ${n}`} selected={borisLevel === n} onPress={() => setBorisLevel(n)} />)}
          </View>
          <View style={styles.row}>
            <Choice label="Без наряда" selected={!borisSkin} onPress={() => setBorisSkin("")} />
            <Choice label="Шарфик" selected={borisSkin === "scarf"} onPress={() => setBorisSkin("scarf")} />
          </View>
          </>}
          {(screen === "crowns" || screen === "trio" || screen === "compare" || screen === "skins") && <View style={styles.row}>
            {[1, 5, 9, 10].map(n => <Choice key={n} label={`Уровень ${n}`} selected={level === n} onPress={() => { setLevel(n); setBorisLevel(n); }} />)}
          </View>}
          {(screen === "skins" || screen === "trio") && <View style={styles.row}>
            {SKINS.filter(([id]) => ["", "scarf", "glasses", "backpack", "bow", "wreath", "beret"].includes(id)).map(([id, label]) =>
              <Choice key={id} label={label} selected={skin === id} onPress={() => { setSkin(id); setBorisSkin(id); }} />)}
          </View>}
          {screen === "compare" && <Choice label="Крупно" selected={large} onPress={() => setLarge(!large)} />}
        </> : <>
        <View style={styles.row}>
          {[1, 5, 10].map((n) => <Choice key={n} label={`Уровень ${n}`} selected={level === n} onPress={() => setLevel(n)} />)}
          <Choice label={moving ? "Пауза" : "Движение"} selected={!moving} onPress={() => setMoving(!moving)} />
        </View>
        {screen === "hive" || screen === "collection" ? <View style={styles.row}>
          <Choice label="Исходная" selected={art === "original"} onPress={() => setArt("original")} />
          <Choice label="Новая" selected={art === "honey"} onPress={() => { setArt("honey"); setScreen("compare"); }} />
        </View> : <View style={styles.row}>
          {TURNS.map(([value, label]) => <Choice key={label} label={label} selected={!autoTurn && turn === value}
            onPress={() => { setAutoTurn(false); setTurn(value); }} />)}
          <Choice label="Автоповорот" selected={autoTurn} onPress={() => setAutoTurn(!autoTurn)} />
          {screen === "compare" && <Choice label="Крупно" selected={large} onPress={() => setLarge(!large)} />}
        </View>}
        {screen !== "skins" ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skinRow}>
          {SKINS.map(([id, label]) => <Choice key={id} label={label} selected={skin === id} onPress={() => setSkin(id)} />)}
        </ScrollView> : null}
        </>}
      </View>
      {screen === "crowns" ? <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {REFERENCE_BEES.map(([id, name], i) => <View key={id} style={styles.trioCard}>
            <PreviewBee {...shared} id={id} art="reference" level={level} skin="" size={96} seed={i + 1} />
            <Txt v="small" center>{name}</Txt>
          </View>)}
        </View>
        <Txt v="small" center>Жужа: до и после максимального уровня</Txt>
        <View style={styles.row}>
          {[9, 10].map(n => <View key={n} style={styles.trioCard}>
            <PreviewBee {...shared} id="zhuzha" art="reference" level={n} skin="" size={154} />
            <Txt v="small" center>{`ур. ${n}`}</Txt>
          </View>)}
        </View>
      </ScrollView> : screen === "batch" ? <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {([ ["margo", "Марго"], ["nochka", "Ночка"] ] as const).map(([id, name], index) =>
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Новая пчела: ${name}`} accessibilityState={{ selected: pairBee === id }}
              onPress={() => setPairBee(id)} style={[styles.trioCard, pairBee === id && { borderColor: C.honeyDeep }]}>
              <PreviewBee {...shared} id={id} art="reference" level={1} skin="" size={154} seed={index + 1} />
              <Txt v="small" center>{name}</Txt>
            </Pressable>)}
        </View>
        <View style={styles.card}>
          <View style={[styles.beeBg, { height: 300, backgroundColor: pairBee === "margo" ? "#F0E5F7" : "#E5ECF8" }]}>
            <PreviewBee {...shared} id={pairBee} art="reference" level={1} skin="" size={280} seed={pairBee === "margo" ? 1 : 2} />
          </View>
          <Txt v="h3" style={{ marginTop: 8 }}>{pairBee === "margo" ? "Марго" : "Ночка"}</Txt>
          <Txt v="small" color={C.dim}>Новый рисунок · та же анимация</Txt>
        </View>
        <View style={styles.scale}>
          <Txt v="small" center>Размер возле соты</Txt>
          <View style={styles.row}>
            <Image source={ART.comb} style={{ width: 72, height: 72 }} />
            <PreviewBee {...shared} id="margo" art="reference" level={1} skin="" size={48} seed={1} />
            <PreviewBee {...shared} id="nochka" art="reference" level={1} skin="" size={48} seed={2} />
          </View>
        </View>
      </ScrollView> : screen === "trio" ? <ScrollView contentContainerStyle={styles.content}>
        <Txt v="small" center>Посадка аксессуаров рядом с Жужей</Txt>
        <View style={styles.row}>
          {(["zhuzha", selectedBee === "zhuzha" ? "pushinka" : selectedBee] as const).map((id, i) => <View key={id} style={styles.trioCard}>
            <PreviewBee {...shared} id={id} art="reference" level={level} skin={skin} size={154} seed={i + 1} />
            <Txt v="h3" center>{REFERENCE_BEES.find(([beeId]) => beeId === id)?.[1]}</Txt>
          </View>)}
        </View>
        <View style={styles.row}>
          {REFERENCE_BEES.map(([id, name], i) =>
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Показать: ${name}`} accessibilityState={{ selected: selectedBee === id }}
              onPress={() => setSelectedBee(id)} style={[styles.trioCard, selectedBee === id && { borderColor: C.honeyDeep }]}>
              <PreviewBee {...shared} id={id} art="reference" level={id === "boris" ? borisLevel : level} skin={id === "boris" ? borisSkin : skin} size={96} seed={i + 1} />
              <Txt v="small" center>{name}</Txt>
            </Pressable>)}
        </View>
        <View style={styles.card}>
          <View style={[styles.beeBg, { height: 300, backgroundColor: selectedBee === "boris" ? "#E1F0FC" : selectedBee === "lavanda" ? "#EEE4FA" : selectedBee === "solnyshko" ? "#FFF0CF" : "#EEF5D6" }]}>
            <PreviewBee {...shared} id={selectedBee} art="reference" level={selectedBee === "boris" ? borisLevel : level} skin={selectedBee === "boris" ? borisSkin : skin} size={280} seed={selectedBee === "pushinka" ? 2 : selectedBee === "boris" ? 3 : 1} />
          </View>
          <Txt v="h3" style={{ marginTop: 8 }}>{selectedBee === "boris" ? "Шмель Борис" : REFERENCE_BEES.find(([id]) => id === selectedBee)?.[1]}</Txt>
          <Txt v="small" color={C.dim}>{selectedBee === "zhuzha" ? "Одобренный эталон" : "Новый рисунок · та же анимация"}</Txt>
        </View>
        <View style={styles.scale}>
          <Txt v="small" center>Размер возле соты</Txt>
          <View style={styles.row}>
            <Image source={ART.comb} style={{ width: 72, height: 72 }} />
            {REFERENCE_BEES.map(([id]) => id).map((id, i) => <PreviewBee key={id} {...shared} id={id} art="reference" level={id === "boris" ? borisLevel : level} skin={id === "boris" ? borisSkin : skin} size={48} seed={i + 1} />)}
          </View>
        </View>
      </ScrollView> : screen === "compare" ? <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.comparison}>
          {!large && <ComparisonCard {...shared} art="original" label="Исходная" />}
          <ComparisonCard {...shared} art={art} label={art === "reference" ? "Спрайт по референсу" : "3D-попытка"} large={large} />
        </View>
        <View style={styles.scale}>
          <Txt v="small" center>Размер возле улья</Txt>
          <View style={styles.row}>
            <Image source={ART.comb} style={{ width: 72, height: 72 }} />
            <PreviewBee {...shared} art="original" size={42} />
            <PreviewBee {...shared} art={art} size={42} />
          </View>
        </View>
        <Txt v="small" color={C.dim}>{art === "reference" ? "Анимация одобренного спрайта: исходные пиксели разделены масками на корпус, крылья и глаза. Это 2D-анимация, без 3D-разворота." : "Это рендеры модели и настоящая анимация приложения. Сравни форму, грани и прозрачность крыльев."}</Txt>
      </ScrollView> : screen === "skins" ? <ScrollView contentContainerStyle={styles.content}>
        {art === "reference" && <>
          <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0, height: 44 }} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.skinRow, { alignItems: "center" }]}>
            {REFERENCE_BEES.map(([id, name]) => <Choice key={id} label={`Пчела: ${name}`} selected={selectedBee === id} onPress={() => setSelectedBee(id)} />)}
          </ScrollView>
          <View style={{ backgroundColor: C.card, padding: 12, borderRadius: 24, height: 316, flexShrink: 0 }}>
            <View style={[styles.beeBg, { height: 270 }]}>
              <PreviewBee {...shared} id={selectedBee} art="reference" size={250} />
            </View>
            <Txt v="h3" center>{REFERENCE_BEES.find(([id]) => id === selectedBee)?.[1]}</Txt>
          </View>
        </>}
        <View style={styles.grid}>
          {(art === "reference" ? SKINS.filter(([id]) => ["bow", "wreath", "beret", "backpack"].includes(id)) : SKINS).map(([id, label], index) => <View key={id} style={styles.skinCard}>
            <PreviewBee {...shared} id={art === "reference" ? selectedBee : "zhuzha"} art={art === "reference" ? "reference" : "honey"} skin={id} size={154} seed={index + 1} />
            <Txt v="small" center>{label}</Txt>
          </View>)}
        </View>
        {art === "reference" && <View style={styles.scale}>
          <Txt v="small" center>Наряды в игровом размере</Txt>
          <View style={styles.row}>
            <Image source={ART.comb} style={{ width: 72, height: 72 }} />
            {["bow", "wreath", "beret", "backpack"].map((id, i) => <PreviewBee key={id} {...shared} id={selectedBee} art="reference" skin={id} size={48} seed={i + 1} />)}
          </View>
        </View>}
      </ScrollView> : screen === "hive" ? <HiveScreen s={s} now={now} cheer={cheer}
        onCollect={() => setCheer(cheer + 1)} onComb={() => false} onUpgrade={() => false} />
        : <BeesScreen s={s} onUnlock={() => false} onLevelUp={(id) => { if (id === "boris") setBorisLevel(Math.min(10, borisLevel + 1)); else setLevel(Math.min(10, level + 1)); return true; }}
          onSkin={(id, value) => { if (id === "boris") { if (value && !["scarf", "glasses", "backpack", "bow", "wreath", "beret"].includes(value)) return false; setBorisSkin(value ?? ""); } else setSkin(value ?? ""); return true; }} onGarden={() => setScreen("hive")} />}
    </View>
  </BeeArtProvider>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, width: "100%", maxWidth: 520, alignSelf: "center" },
  toolbar: { padding: 16, paddingBottom: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  choice: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: C.bg2, borderRadius: 16 },
  selected: { backgroundColor: C.honeyDeep },
  skinRow: { gap: 6, paddingBottom: 6 },
  content: { padding: 16, gap: 16, paddingBottom: 36 },
  comparison: { flexDirection: "row", gap: 12 },
  trioCard: { flex: 1, minWidth: 100, alignItems: "center", backgroundColor: C.card, paddingVertical: 8, borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  card: { flex: 1, backgroundColor: C.card, padding: 12, borderRadius: 24 },
  beeBg: { height: 148, backgroundColor: "#EEF5D6", borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: C.jelly, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 },
  scale: { backgroundColor: C.bg2, borderRadius: 20, padding: 16, gap: 12, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  skinCard: { width: "47%", backgroundColor: C.card, padding: 12, borderRadius: 20, alignItems: "center", gap: 6 },
});
