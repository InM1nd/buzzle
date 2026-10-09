import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { GameState } from "../logic/game";
import { BEES, BeeSpecies, Rarity } from "../logic/bees";
import { ART } from "../ui/art";
import { BeeSprite, Hover, Mascot, useFace } from "../ui/BeeSprite";
import { C, shadow } from "../ui/theme";
import { CloseBtn, GameButton, Overlay, Press, Txt } from "../ui/components";

const RARITY: Record<Rarity, { name: string; color: string; bg: string }> = {
  common: { name: "обычная", color: "#7A8A3A", bg: "#EEF5D8" },
  rare: { name: "редкая", color: "#2F7FD0", bg: "#E1EEFC" },
  epic: { name: "эпическая", color: "#8A52D6", bg: "#EFE4FF" },
  legendary: { name: "легендарная", color: "#D27A00", bg: "#FFEBC2" },
};

interface Props { s: GameState; onUnlock: (id: string) => boolean }

export default function BeesScreen({ s, onUnlock }: Props) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<BeeSpecies | null>(null);
  const [justUnlocked, setJust] = useState<string | null>(null);
  const colW = (Math.min(width, 520) - 16 * 2 - 12) / 2;
  const owned = new Set(s.bees);
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Txt v="h2">Коллекция пчёл</Txt>
            <Txt v="small" color={C.dim}>Открыто {s.bees.length} из {BEES.length}. Каждая пчела даёт постоянный бонус.</Txt>
          </View>
        </View>
        <View style={styles.jellyHint}>
          <Image source={ART.jelly} style={{ width: 28, height: 28 }} />
          <Txt v="small" color="#6B4CA8" style={{ flex: 1 }}>Маточное молочко дают звёзды ежедневной головоломки, задания и награды за вход.</Txt>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {BEES.map((b, i) => {
            const has = owned.has(b.id);
            const can = !has && s.jelly >= b.cost;
            const r = RARITY[b.rarity];
            return (
              <Press key={b.id} onPress={() => setOpen(b)} style={[styles.card, shadow, { width: colW }, !has && { backgroundColor: "#FBF3E4" }]}
                accessibilityRole="button" accessibilityLabel={`${b.name}${has ? "" : ", закрыта"}`}>
                <View style={[styles.beeBg, { backgroundColor: has ? r.bg : "#F2E6D0" }]}>
                  {has ? (
                    <CardBee id={b.id} i={i} />
                  ) : (
                    <BeeSprite id={b.id} size={86} tint="#DCC7A3" />
                  )}
                  {justUnlocked === b.id ? <Sparkle /> : null}
                </View>
                <Txt v="h3" numberOfLines={1} style={{ marginTop: 8 }}>{has ? b.name : "???"}</Txt>
                <Txt v="tiny" color={r.color}>{r.name.toUpperCase()}</Txt>
                <Txt v="small" color={C.dim} numberOfLines={2} style={{ minHeight: 34, marginTop: 2 }}>{b.ability}</Txt>
                {has ? (
                  <View style={styles.ownedTag}><Image source={ART.check} style={{ width: 16, height: 16 }} /><Txt v="tiny" color={C.greenDark}>В УЛЬЕ</Txt></View>
                ) : (
                  <View style={[styles.costTag, can && { backgroundColor: C.jelly }]}>
                    <Image source={ART.jelly} style={{ width: 18, height: 18 }} />
                    <Txt v="small" color={can ? "#fff" : "#8C6FBF"}>{b.cost}</Txt>
                  </View>
                )}
              </Press>
            );
          })}
        </View>
      </ScrollView>
      <Overlay visible={!!open} onClose={() => setOpen(null)}>
        {open ? (
          <BeeDetail bee={open} has={owned.has(open.id)} jelly={s.jelly}
            onUnlock={() => { if (onUnlock(open.id)) { setJust(open.id); setTimeout(() => setJust(null), 1600); } }}
            onClose={() => setOpen(null)} />
        ) : null}
      </Overlay>
    </>
  );
}

/** Idle bee on a collection card: hover + flapping wings + an occasional blink / glance. */
function CardBee({ id, i }: { id: string; i: number }) {
  const face = useFace(true, i * 13 + 5);
  return (
    <Hover amp={3} sway={2.5} period={1500 + i * 97} phase={(i * 0.37) % 1}>
      <BeeSprite id={id} size={86} seed={i} face={face} />
    </Hover>
  );
}

function Sparkle() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 1200, useNativeDriver: true }).start(); }, [a]);
  return (
    <Animated.Image source={ART.star} style={{
      position: "absolute", width: 120, height: 120,
      opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
      transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) }],
    }} />
  );
}

function BeeDetail({ bee, has, jelly, onUnlock, onClose }: { bee: BeeSpecies; has: boolean; jelly: number; onUnlock: () => void; onClose: () => void }) {
  const r = RARITY[bee.rarity];
  const pop = useRef(new Animated.Value(has ? 1 : 0.9)).current;
  const [wasLocked] = useState(!has);
  useEffect(() => {
    if (has && wasLocked) {
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 18, speed: 8 }).start();
    }
  }, [has, wasLocked, pop]);
  return (
    <View style={{ alignItems: "center" }}>
      <CloseBtn onPress={onClose} />
      <View style={[styles.detailBg, { backgroundColor: has ? r.bg : "#F2E6D0" }]}>
        {has && wasLocked ? <Sparkle /> : null}
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          {has ? <Mascot id={bee.id} size={156} seed={bee.id.length * 7 + 1} /> : <BeeSprite id={bee.id} size={156} tint="#D8C29C" />}
        </Animated.View>
      </View>
      <Txt v="h1" center style={{ marginTop: 10 }}>{has ? bee.name : "Неизвестная пчела"}</Txt>
      <Txt v="tiny" color={r.color}>{r.name.toUpperCase()}</Txt>
      <View style={styles.ability}><Txt v="h3" color="#6B4CA8" center>{bee.ability}</Txt></View>
      <Txt v="body" color={C.dim} center style={{ marginBottom: 16 }}>{has ? bee.flavor : "Откройте за маточное молочко, чтобы познакомиться."}</Txt>
      {has ? (
        <GameButton title={wasLocked ? "Добро пожаловать в улей!" : "Уже в улье"} color="white" onPress={onClose} style={{ alignSelf: "stretch" }} />
      ) : (
        <GameButton
          title={`Открыть · ${bee.cost}`}
          icon={ART.jelly}
          color="purple"
          disabled={jelly < bee.cost}
          sub={jelly < bee.cost ? `не хватает ${bee.cost - jelly}` : undefined}
          onPress={onUnlock}
          style={{ alignSelf: "stretch" }}
          label={`Открыть пчелу за ${bee.cost} молочка`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  jellyHint: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F1E8FF", borderRadius: 16, padding: 10, marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 12 },
  beeBg: { height: 104, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ownedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  costTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-start", backgroundColor: "#F1E8FF", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  detailBg: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center", marginTop: 4 },
  ability: { backgroundColor: "#F1E8FF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 10 },
});
