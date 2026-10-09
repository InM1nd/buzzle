/**
 * v1.3 opening a surprise comb: tap 3 times (the wax cracks in 3 stages), the player's bees fly in to watch,
 * a flash, then the contents pop out one by one — rare+ items with a coloured burst and haptics.
 * «Открыть все» skips the show and lists everything at once. The comb is only opened (and saved) on the
 * third tap, so closing early never loses anything.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { BOX_INFO, BoxKind, Drop, Rarity, RARITIES } from "../logic/loot";
import { ITEM_ART } from "../ui/beeArt";
import { ART } from "../ui/art";
import { BeeSprite, Hover } from "../ui/BeeSprite";
import { C, F, shadow } from "../ui/theme";
import { GameButton, Press, Txt } from "../ui/components";
import { hHeavy, hLight, hSuccess, hTick } from "../ui/haptics";
import { addBackListener } from "../platform/back";
import { useInsets } from "../platform/insets";
import { boxArt, DropIcon, dropSub, dropTitle, isResource, RARITY_UI } from "../ui/lootUi";
import { fmt } from "../ui/components";

const rIdx = (r: Rarity) => RARITIES.indexOf(r);

interface Props {
  kind: BoxKind;
  /** combs of this kind available */
  left: number;
  bees: string[];
  skins?: Record<string, string>;
  onOpen: () => Drop[] | null;
  onOpenAll: () => Drop[][] | null;
  onClose: () => void;
}

export default function BoxOpen({ kind, left, bees, skins, onOpen, onOpenAll, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useInsets();
  const [round, setRound] = useState(0);          // remount the tap stage for "open another"
  const [cracks, setCracks] = useState(0);
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [all, setAll] = useState<Drop[][] | null>(null);
  const [shown, setShown] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const boxScale = useRef(new Animated.Value(0.6)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const B = Math.min(220, width * 0.56);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fade]);
  useEffect(() => {
    boxScale.setValue(0.6);
    Animated.spring(boxScale, { toValue: 1, bounciness: 12, speed: 9, useNativeDriver: true }).start();
  }, [round, boxScale]);
  useEffect(() => {
    const sub = addBackListener(() => { if (!busy.current) onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  // reveal drops one after another, best last (openComb sorts item slots by rarity)
  useEffect(() => {
    if (!drops || shown >= drops.length) return;
    const t = setTimeout(() => {
      const d = drops[shown];
      const r = isResource(d) ? "common" : d.rarity;
      if (rIdx(r) >= 2 || d.t === "box") { hSuccess(); burst(); }
      else if (r === "rare") hLight(); else hTick();
      setShown((n) => n + 1);
    }, shown === 0 ? 380 : 300);
    return () => clearTimeout(t);
  }, [drops, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const burst = () => {
    flash.setValue(0.9);
    Animated.timing(flash, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const tap = () => {
    if (drops || all || busy.current) return;
    const n = cracks + 1;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    if (n < 3) { hLight(); setCracks(n); return; }
    hHeavy();
    setCracks(3);
    busy.current = true;
    setTimeout(() => {
      const res = onOpen();
      busy.current = false;
      if (!res) { onClose(); return; }
      burst();
      rays.setValue(0);
      Animated.timing(rays, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
      setShown(0);
      setDrops(res);
    }, 260);
  };

  const openAll = () => {
    if (busy.current) return;
    const res = onOpenAll();
    if (!res) return;
    hHeavy(); burst();
    setTimeout(() => hSuccess(), 160);
    setAll(res); setDrops(null);
  };
  const again = () => { setDrops(null); setShown(0); setCracks(0); setRound((r) => r + 1); };

  const best: Rarity = useMemo(() => {
    const ds = all ? all.flat() : drops ?? [];
    return ds.reduce<Rarity>((b, d) => (!isResource(d) && rIdx(d.rarity) > rIdx(b) ? d.rarity : b), "common");
  }, [drops, all]);
  const done = !!drops && shown >= drops.length;
  const remaining = left - (drops ? 1 : 0);
  const tx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] });
  const rot = shake.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });
  const glow = RARITY_UI[best].color;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 14 }]} accessibilityViewIsModal>
      <View style={styles.head}>
        <Txt v="tiny" color="#FFE2A8">{all ? "ОТКРЫТО" : "СОТА-СЮРПРИЗ"}</Txt>
        <Txt v="h2" color="#fff" center>{all ? `${all.length} × ${BOX_INFO[kind].name}` : BOX_INFO[kind].name}</Txt>
      </View>

      {!drops && !all ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* the bees gather to watch */}
          <Gathering key={round} bees={bees} skins={skins} w={width} B={B} />
          <Press onPress={tap} haptic={false} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`Тапни по соте: ${3 - cracks} из 3`}>
            <Animated.View style={{ width: B, height: B, transform: [{ translateX: tx }, { rotate: rot }, { scale: boxScale }] }}>
              <Image source={boxArt(kind)} style={{ width: B, height: B }} />
              {cracks > 0 ? <Image source={ITEM_ART[`crack${cracks}`].src} style={[StyleSheet.absoluteFill, { width: B, height: B }]} /> : null}
            </Animated.View>
          </Press>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => <View key={i} style={[styles.dot, i < cracks && { backgroundColor: C.honey }]} />)}
          </View>
          <Txt v="h3" color="#FFE2A8" center style={{ marginTop: 6 }}>{cracks === 0 ? "Тапни 3 раза, чтобы расколоть воск" : cracks === 1 ? "Ещё!" : cracks === 2 ? "Последний тап!" : "…"}</Txt>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, alignSelf: "stretch" }} contentContainerStyle={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ width: 150, height: 120, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={[styles.rays, { borderColor: glow, opacity: rays.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), transform: [{ scale: rays.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: "45deg" }] }]} />
            <Animated.View style={[styles.rays, { borderColor: glow, opacity: rays.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }), transform: [{ scale: rays.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.25] }) }] }]} />
            <Image source={boxArt(kind)} style={{ width: 92, height: 92, opacity: 0.95 }} />
            {!all ? <Image source={ITEM_ART.crack3.src} style={{ position: "absolute", width: 92, height: 92 }} /> : null}
          </View>
          {all ? <Summary all={all} /> : (
            <View style={styles.grid}>
              {drops!.slice(0, shown).map((d, i) => <DropCard key={i} d={d} w={Math.min(150, (width - 64) / 3)} />)}
            </View>
          )}
        </ScrollView>
      )}

      {/* buttons */}
      <View style={styles.btns}>
        {!drops && !all ? (
          <>
            {left > 1 ? <GameButton title={`Открыть все (${left})`} color="purple" onPress={openAll} label="Открыть все соты этого вида" /> : null}
            <GameButton title="Позже" color="white" small onPress={onClose} />
          </>
        ) : done || all ? (
          <>
            {drops && remaining > 0 ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <GameButton title="Ещё одну" color="green" onPress={again} style={{ flex: 1 }} />
                {remaining > 1 ? <GameButton title={`Все (${remaining})`} color="purple" onPress={openAll} style={{ flex: 1 }} label="Открыть все соты этого вида" /> : null}
              </View>
            ) : null}
            <GameButton title="Забрать" color="honey" onPress={onClose} label="Забрать и закрыть" />
          </>
        ) : <View style={{ height: 62 }} />}
      </View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FFF4D6", opacity: flash }]} />
    </Animated.View>
  );
}

function Gathering({ bees, skins, w, B }: { bees: string[]; skins?: Record<string, string>; w: number; B: number }) {
  const list = (bees.length ? bees : ["zhuzha"]).slice(-3);
  const spots = [{ x: -B * 0.72, y: -B * 0.35, from: -w }, { x: B * 0.72, y: -B * 0.42, from: w }, { x: 0, y: -B * 0.78, from: -w * 0.6 }];
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
      {list.map((id, i) => <Watcher key={id + i} id={id} skin={skins?.[id]} i={i} {...spots[i]} />)}
    </View>
  );
}
function Watcher({ id, skin, i, x, y, from }: { id: string; skin?: string; i: number; x: number; y: number; from: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 900 + i * 180, delay: 120 + i * 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, i]);
  return (
    <Animated.View style={{
      position: "absolute",
      transform: [
        { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [from, x] }) },
        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [y - 140, y] }) },
      ],
    }}>
      <Hover amp={4} phase={i / 3}><BeeSprite id={id} size={74} seed={i + 3} skin={skin} turn={x < 0 ? 0.6 : x > 0 ? -0.6 : 0} /></Hover>
    </Animated.View>
  );
}

function DropCard({ d, w }: { d: Drop; w: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, bounciness: 14, speed: 10, useNativeDriver: true }).start(); }, [a]);
  const r = isResource(d) ? null : RARITY_UI[d.rarity];
  const sub = dropSub(d);
  return (
    <Animated.View style={[styles.card, { width: w, borderColor: r?.color ?? "#F1DFC0", backgroundColor: r ? r.bg : "#FFF9EE", transform: [{ scale: a }] }]}
      accessibilityLabel={`${dropTitle(d)}${r ? `, ${r.name}` : ""}`}>
      {r && (d.rarity === "epic" || d.rarity === "legendary") ? <View style={[styles.glow, { backgroundColor: r.color }]} /> : null}
      <DropIcon d={d} size={w * 0.52} />
      <Txt v="h3" center numberOfLines={2} style={{ fontSize: 14, lineHeight: 17, marginTop: 4 }}>{dropTitle(d)}</Txt>
      {r ? <Txt v="tiny" color={r.color} center>{r.name.toUpperCase()}</Txt> : null}
      {sub ? <Txt v="tiny" color={C.dim} center numberOfLines={2}>{sub}</Txt> : null}
    </Animated.View>
  );
}

/** «Открыть все»: everything summed up */
function Summary({ all }: { all: Drop[][] }) {
  const flat = all.flat();
  const res = { honey: 0, nectar: 0, jelly: 0 };
  const items = new Map<string, { d: Drop; n: number; fresh: boolean }>();
  let pollen = 0;
  for (const d of flat) {
    if (d.t === "honey" || d.t === "nectar" || d.t === "jelly") { res[d.t] += d.n; continue; }
    if ((d.t === "item" || d.t === "fragment") && d.pollen) pollen += d.pollen;
    const key = d.t === "item" ? `i:${d.id}` : d.t === "seed" ? `s:${d.flower}` : d.t === "booster" ? `b:${d.b}` : d.t === "fragment" ? "f" : "box";
    const cur = items.get(key);
    const amount = d.t === "item" || d.t === "box" ? 1 : d.n;
    if (cur) { cur.n += amount; cur.fresh = cur.fresh || (d.t === "item" && !d.dup); if (rIdx(d.rarity) > rIdx(cur.d.rarity)) cur.d = d; }
    else items.set(key, { d, n: amount, fresh: d.t === "item" && !d.dup });
  }
  const list = Array.from(items.values()).sort((a, b) => rIdx(b.d.rarity) - rIdx(a.d.rarity) || Number(b.fresh) - Number(a.fresh));
  return (
    <View style={{ alignSelf: "stretch" }}>
      <View style={styles.resRow}>
        <Res img="honey" n={res.honey} /><Res img="nectar" n={res.nectar} />{res.jelly ? <Res img="jelly" n={res.jelly} /> : null}
        {pollen ? <Res img="pollen" n={pollen} /> : null}
      </View>
      <View style={styles.grid}>
        {list.map(({ d, n, fresh }, i) => {
          const r = RARITY_UI[d.rarity];
          const title = d.t === "item" ? dropTitle(d) : dropTitle({ ...d, n } as Drop);
          return (
            <View key={i} style={[styles.card, { width: 104, borderColor: r.color, backgroundColor: r.bg }]} accessibilityLabel={`${title}${d.t === "item" && n > 1 ? ` ×${n}` : ""}, ${r.name}`}>
              <DropIcon d={d} size={54} />
              <Txt v="small" center numberOfLines={2} style={{ marginTop: 2 }}>{title}{d.t === "item" && n > 1 ? ` ×${n}` : ""}</Txt>
              {fresh ? <Txt v="tiny" color={C.greenDark} center>НОВОЕ!</Txt> : <Txt v="tiny" color={r.color} center>{r.name.toUpperCase()}</Txt>}
            </View>
          );
        })}
      </View>
    </View>
  );
}
function Res({ img, n }: { img: "honey" | "nectar" | "jelly" | "pollen"; n: number }) {
  return (
    <View style={styles.res}>
      <Image source={ART[img]} style={{ width: 26, height: 26 }} />
      <Txt v="h3" style={[F.black, { fontSize: 17 }]}>+{fmt(n)}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "rgba(46,24,6,0.94)", zIndex: 80, elevation: 80, alignItems: "center" },
  head: { alignItems: "center", paddingHorizontal: 20 },
  dots: { flexDirection: "row", gap: 8, marginTop: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.25)" },
  rays: { position: "absolute", width: 150, height: 150, borderRadius: 28, borderWidth: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 8 },
  card: { borderRadius: 20, borderWidth: 3, padding: 8, alignItems: "center", overflow: "hidden", ...shadow },
  glow: { position: "absolute", top: -30, width: 120, height: 80, borderRadius: 60, opacity: 0.18 },
  btns: { alignSelf: "stretch", paddingHorizontal: 18, gap: 10 },
  resRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  res: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF9EE", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
