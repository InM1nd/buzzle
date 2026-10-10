import { t } from "../i18n";
import { SKIN_BY_ID } from "../logic/loot";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { GameState, beeDisplayName, beeLevel, beeLevelCost, graphemes, MAX_BEE_NAME } from "../logic/game";
import { abilityAt, levelCost, BEES, BeeSpecies, LEVEL_HIVE_BONUS, MAX_BEE_LEVEL, Rarity } from "../logic/bees";
import { ART } from "../ui/art";
import { BeeSprite, Hover, Mascot, useFace } from "../ui/BeeSprite";
import { C, F, shadow } from "../ui/theme";
import { Bar, CloseBtn, fmt, GameButton, Overlay, Press, Txt } from "../ui/components";
import { Text } from "react-native";

const RARITY: Record<Rarity, { name: string; color: string; bg: string }> = {
  common: { get name() { return t("rarityBee.common"); }, color: "#7A8A3A", bg: "#EEF5D8" },
  rare: { get name() { return t("rarityBee.rare"); }, color: "#2F7FD0", bg: "#E1EEFC" },
  epic: { get name() { return t("rarityBee.epic"); }, color: "#8A52D6", bg: "#EFE4FF" },
  legendary: { get name() { return t("rarityBee.legendary"); }, color: "#D27A00", bg: "#FFEBC2" },
};

interface Props { s: GameState; onSkin?: (bee: string, skin: string | null) => boolean; onAssemble?: () => boolean; onUnlock: (id: string) => boolean; onLevelUp: (id: string) => boolean; onRename?: (id: string, name: string) => boolean; onGarden?: () => void }

export default function BeesScreen({ s, onSkin, onAssemble, onUnlock, onLevelUp, onRename, onGarden }: Props) {
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
            <Txt v="h2">{t("bees.title")}</Txt>
            <Txt v="small" color={C.dim}>{t("bees.sub", { a: s.bees.length, b: BEES.length, max: MAX_BEE_LEVEL })}</Txt>
          </View>
        </View>
        <Press onPress={onGarden} style={styles.nectarHint} accessibilityRole="button" accessibilityLabel={t("bees.nectarLabel")}>
          <Image source={ART.nectar} style={{ width: 30, height: 30 }} />
          <View style={{ flex: 1 }}>
            <Txt v="h3" color="#9C2F5C">{t("bees.nectar", { n: fmt(s.nectar) })}</Txt>
            <Txt v="small" color="#9C2F5C">{t("bees.nectarHint")}</Txt>
          </View>
        </Press>
        <View style={styles.jellyHint}>
          <Image source={ART.jelly} style={{ width: 28, height: 28 }} />
          <Txt v="small" color="#6B4CA8" style={{ flex: 1 }}>{t("bees.jellyHint")}</Txt>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {BEES.map((b, i) => {
            const has = owned.has(b.id);
            const can = !has && s.jelly >= b.cost;
            const lvl = beeLevel(s, b.id);
            const lc = has ? beeLevelCost(s, b.id) : null;
            const canLvl = !!lc && s.nectar >= lc.nectar && s.jelly >= lc.jelly;
            const r = RARITY[b.rarity];
            const custom = has && !!s.beeNames[b.id];
            const shown = beeDisplayName(s, b.id);
            return (
              <Press key={b.id} onPress={() => setOpen(b)} style={[styles.card, shadow, { width: colW }, !has && { backgroundColor: "#FBF3E4" }]}
                accessibilityRole="button" accessibilityLabel={custom ? `${shown} (${b.name})` : (has ? b.name : t("bees.locked", { name: b.name }))}>
                <View style={[styles.beeBg, { backgroundColor: has ? r.bg : "#F2E6D0" }]}>
                  {has ? (
                    <CardBee id={b.id} i={i} level={lvl} skin={s.beeSkins[b.id]} />
                  ) : (
                    <BeeSprite id={b.id} size={86} tint="#DCC7A3" />
                  )}
                  {justUnlocked === b.id ? <Sparkle /> : null}
                  {has ? (
                    <View style={[styles.lvlBadge, lvl >= MAX_BEE_LEVEL && { backgroundColor: "#E2A400" }]}>
                      <Text style={[F.black, { color: "#fff", fontSize: 12 }]}>{lvl >= MAX_BEE_LEVEL ? t("bees.max") : t("bees.lvl", { n: lvl })}</Text>
                    </View>
                  ) : null}
                  {canLvl ? <View style={styles.upDot}><Text style={[F.black, { color: "#fff", fontSize: 13, lineHeight: 16 }]}>↑</Text></View> : null}
                </View>
                <Txt v="h3" numberOfLines={1} style={{ marginTop: 8 }}>{has ? shown : "???"}</Txt>
                <Txt v="tiny" color={r.color} numberOfLines={1}>{custom ? `${b.name.toUpperCase()} · ` : ""}{r.name.toUpperCase()}</Txt>
                <Txt v="small" color={C.dim} numberOfLines={2} style={{ minHeight: 34, marginTop: 2 }}>{has ? abilityAt(b, lvl) : b.ability}</Txt>
                {has ? (
                  <View style={styles.ownedTag}><Image source={ART.check} style={{ width: 16, height: 16 }} /><Txt v="tiny" color={C.greenDark}>{t("bees.inHive")}</Txt></View>
                ) : b.fragments ? (
                  <View style={[styles.costTag, s.loot.fragments >= b.fragments && { backgroundColor: "#5B5FC7" }]}>
                    <Image source={ART.fragment} style={{ width: 18, height: 18 }} />
                    <Txt v="small" color={s.loot.fragments >= b.fragments ? "#fff" : "#5B5FC7"}>{Math.min(s.loot.fragments, b.fragments)}/{b.fragments}</Txt>
                  </View>
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
          <BeeDetail bee={open} has={owned.has(open.id)} jelly={s.jelly} nectar={s.nectar} level={beeLevel(s, open.id)}
            skin={s.beeSkins[open.id] ?? null} skins={s.loot.owned.filter((x) => SKIN_BY_ID[x])} fragments={s.loot.fragments}
            onSkin={onSkin ? (k) => onSkin(open.id, k) : undefined}
            onAssemble={() => { if (onAssemble?.()) { setJust(open.id); setTimeout(() => setJust(null), 1600); } }}
            name={beeDisplayName(s, open.id)} custom={!!s.beeNames[open.id]}
            onRename={onRename ? (n) => onRename(open.id, n) : undefined}
            onUnlock={() => { if (onUnlock(open.id)) { setJust(open.id); setTimeout(() => setJust(null), 1600); } }}
            onLevelUp={() => onLevelUp(open.id)}
            onClose={() => setOpen(null)} />
        ) : null}
      </Overlay>
    </>
  );
}

/** Idle bee on a collection card: hover + flapping wings + an occasional blink / glance. */
function CardBee({ id, i, level, skin }: { id: string; i: number; level: number; skin?: string }) {
  const face = useFace(true, i * 13 + 5);
  return (
    <Hover amp={3} sway={2.5} period={1500 + i * 97} phase={(i * 0.37) % 1}>
      <BeeSprite id={id} size={86} seed={i} face={face} level={level} skin={skin} turn={i % 2 ? 0.5 : -0.5} />
    </Hover>
  );
}

const LOOK_TEXT: Record<number, string> = { get 5() { return t("bees.look5"); }, get 10() { return t("bees.look10"); } };
/** Big level-up burst over the bee in the detail sheet. */
function LevelBurst({ level }: { level: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 1500, useNativeDriver: true }).start();
  }, [a, level]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
        const ang = (k / 8) * Math.PI * 2;
        return (
          <Animated.Image key={k} source={ART.star} style={{
            position: "absolute", left: 95 - 14, top: 95 - 14, width: 28, height: 28,
            opacity: a.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 96] }) },
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 96] }) },
              { scale: a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.6] }) },
            ],
          }} />
        );
      })}
    </View>
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

function BeeDetail({ bee, has, jelly, nectar, level, name, custom, onUnlock, onLevelUp, onRename, onClose, skin, skins, fragments, onSkin, onAssemble }: {
  skin: string | null; skins: string[]; fragments: number; onSkin?: (k: string | null) => boolean; onAssemble: () => void;
  bee: BeeSpecies; has: boolean; jelly: number; nectar: number; level: number; name: string; custom: boolean;
  onUnlock: () => void; onLevelUp: () => boolean; onRename?: (name: string) => boolean; onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const r = RARITY[bee.rarity];
  const pop = useRef(new Animated.Value(has ? 1 : 0.9)).current;
  const [wasLocked] = useState(!has);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (has && wasLocked) {
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 18, speed: 8 }).start();
    }
  }, [has, wasLocked, pop]);
  const lvlUp = () => {
    if (!onLevelUp()) return;
    setBurst((b) => b + 1);
    pop.setValue(0.75);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 20, speed: 9 }).start();
  };
  const cost = has ? levelCost(level) : null;
  const enough = !!cost && nectar >= cost.nectar && jelly >= cost.jelly;
  const nextLook = level < 5 ? 5 : level < 10 ? 10 : null;
  return (
    <View style={{ alignItems: "center" }}>
      <CloseBtn onPress={onClose} />
      <View style={[styles.detailBg, { backgroundColor: has ? r.bg : "#F2E6D0" }]}>
        {has && wasLocked ? <Sparkle /> : null}
        {burst ? <LevelBurst key={burst} level={level} /> : null}
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          {has ? <Mascot id={bee.id} size={156} seed={bee.id.length * 7 + 1} level={level} skin={skin ?? undefined} /> : <BeeSprite id={bee.id} size={156} tint="#D8C29C" />}
        </Animated.View>
      </View>
      {has && editing && onRename ? (
        <RenameBox species={bee.name} current={name} custom={custom}
          onSave={(n) => { if (onRename(n)) setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        <View style={styles.titleRow}>
          <Txt v="h1" center numberOfLines={1} style={{ flexShrink: 1 }}>{has ? name : t("bees.unknown")}</Txt>
          {has && onRename ? (
            <Press onPress={() => setEditing(true)} style={styles.pencil} accessibilityRole="button" accessibilityLabel={t("bees.rename")} scaleTo={0.85}>
              <Image source={ART.pencil} style={{ width: 22, height: 22 }} />
            </Press>
          ) : null}
        </View>
      )}
      <Txt v="tiny" color={r.color} center>{has && custom ? `${bee.name.toUpperCase()} · ` : ""}{r.name.toUpperCase()}{has ? t("bees.levelOf", { a: level, b: MAX_BEE_LEVEL }) : ""}</Txt>
      {burst ? (
        <>
          <Txt v="h2" color={C.honeyDeep} center style={{ marginTop: 4 }}>{t("bees.levelUp", { n: level })}</Txt>
          {LOOK_TEXT[level] ? <Txt v="h3" color={C.honeyDark} center>{LOOK_TEXT[level]}</Txt> : null}
        </>
      ) : has && wasLocked ? (
        <Txt v="h2" color={C.greenDark} center style={{ marginTop: 4 }}>{t("bees.welcome")}</Txt>
      ) : null}
      {has ? <Bar progress={level / MAX_BEE_LEVEL} height={10} color={C.jelly} style={{ alignSelf: "stretch", marginTop: 8 }} /> : null}
      <View style={styles.ability}>
        <Txt v="h3" color="#6B4CA8" center>{has ? abilityAt(bee, level) : bee.ability}</Txt>
        {has && level > 1 ? <Txt v="small" color="#6B4CA8" center>{t("bees.levelsBonus", { p: Math.round(LEVEL_HIVE_BONUS * 100 * (level - 1)) })}</Txt> : null}
        {cost ? <Txt v="small" color={C.dim} center>{t("bees.next", { a: abilityAt(bee, level + 1) })}</Txt> : null}
      </View>
      {has && onSkin ? (
        <View style={{ alignSelf: "stretch", marginBottom: 10 }} accessibilityLabel={t("bees.outfits")}>
          <Txt v="tiny" color={C.dim}>{t("bees.outfitCaps")}</Txt>
          {skins.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
              <Press onPress={() => onSkin(null)} style={[styles.skin, !skin && styles.skinOn]} accessibilityRole="radio" accessibilityState={{ selected: !skin }} accessibilityLabel={t("bees.noOutfit")}>
                <Txt v="tiny" color={C.dim} center>{t("bees.noOutfitCaps")}</Txt>
              </Press>
              {skins.map((k) => (
                <Press key={k} onPress={() => onSkin(k)} style={[styles.skin, skin === k && styles.skinOn]} accessibilityRole="radio" accessibilityState={{ selected: skin === k }} accessibilityLabel={SKIN_BY_ID[k].name}>
                  <BeeSprite id={bee.id} size={46} skin={k} level={level} />
                  <Txt v="tiny" numberOfLines={1} center>{SKIN_BY_ID[k].name}</Txt>
                </Press>
              ))}
            </ScrollView>
          ) : <Txt v="small" color={C.dim}>{t("bees.outfitsHint")}</Txt>}
        </View>
      ) : null}
      <Txt v="body" color={C.dim} center style={{ marginBottom: 12 }}>
        {!has && bee.fragments ? t("bees.fragFlavor", { flavor: bee.flavor, n: bee.fragments }) : !has ? t("bees.unlockHint") : nextLook ? t(nextLook === 5 ? "bees.nextLook5" : "bees.nextLook10", { flavor: bee.flavor }) : bee.flavor}
      </Txt>
      {has ? (
        cost ? (
          <GameButton
            title={t("bees.levelBtn", { n: level + 1, cost: `${cost.nectar}${cost.jelly ? ` + ${cost.jelly}` : ""}` })}
            icon={ART.nectar}
            color="purple"
            disabled={!enough}
            sub={!enough ? (nectar < cost.nectar ? t("bees.needNectar", { n: cost.nectar - Math.floor(nectar) }) : t("bees.needJelly", { n: cost.jelly })) : cost.jelly ? t("bees.nectarJelly", { n: cost.jelly }) : t("bees.nectarGarden")}
            onPress={lvlUp}
            style={{ alignSelf: "stretch" }}
            label={t("bees.levelLabel", { n: level + 1 })}
          />
        ) : (
          <GameButton title={t("bees.maxLevel")} color="white" onPress={onClose} style={{ alignSelf: "stretch" }} />
        )
      ) : bee.fragments ? (
        <GameButton title={t("bees.assemble", { a: Math.min(fragments, bee.fragments), b: bee.fragments })} icon={ART.fragment} color={fragments >= bee.fragments ? "purple" : "grey"}
          disabled={fragments < bee.fragments} onPress={onAssemble} style={{ alignSelf: "stretch" }} label={t("bees.assembleLabel")} />
      ) : (
        <GameButton
          title={t("bees.unlockBtn", { n: bee.cost })}
          icon={ART.jelly}
          color="purple"
          disabled={jelly < bee.cost}
          sub={jelly < bee.cost ? t("c.short", { n: bee.cost - jelly }) : undefined}
          onPress={onUnlock}
          style={{ alignSelf: "stretch" }}
          label={t("bees.unlockLabel", { n: bee.cost })}
        />
      )}
    </View>
  );
}

/** Inline name editor: up to MAX_BEE_NAME characters (emoji count as one), reset to the species name. */
function RenameBox({ species, current, custom, onSave, onCancel }: {
  species: string; current: string; custom: boolean; onSave: (name: string) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(custom ? current : "");
  const n = graphemes(draft.replace(/\s+/g, " ").trim()).length;
  const change = (t: string) => {
    const g = graphemes(t.replace(/[\r\n]/g, " "));
    setDraft(g.length > MAX_BEE_NAME ? g.slice(0, MAX_BEE_NAME).join("") : g.join(""));
  };
  return (
    <View style={styles.renameBox}>
      <Txt v="small" color={C.dim} center>{t("bees.askName")}</Txt>
      <TextInput
        value={draft}
        onChangeText={change}
        placeholder={species}
        placeholderTextColor="#C9AE86"
        autoFocus
        maxLength={64}
        returnKeyType="done"
        onSubmitEditing={() => onSave(draft)}
        accessibilityLabel={t("bees.nameLabel")}
        style={[F.black, styles.input]}
      />
      <Txt v="tiny" color={n >= MAX_BEE_NAME ? C.honeyDeep : C.faint} center>{n}/{MAX_BEE_NAME}</Txt>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignSelf: "stretch" }}>
        <GameButton small title={t("bees.cancel")} color="white" onPress={onCancel} style={{ flex: 1 }} label={t("bees.cancelLabel")} />
        <GameButton small title={t("bees.save")} color="green" onPress={() => onSave(draft)} style={{ flex: 1 }} label={t("bees.saveLabel")} />
      </View>
      {custom ? (
        <Press onPress={() => onSave("")} style={{ marginTop: 10 }} accessibilityRole="button" accessibilityLabel={t("bees.resetName", { name: species })}>
          <Txt v="small" color={C.honeyDark} center>{t("bees.resetName", { name: species })}</Txt>
        </Press>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skin: { width: 70, borderRadius: 14, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", padding: 4, minHeight: 72, backgroundColor: "#fff" },
  skinOn: { borderColor: C.honey, backgroundColor: "#FFF3D6" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, maxWidth: "100%" },
  pencil: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF1D6", alignItems: "center", justifyContent: "center" },
  renameBox: { alignSelf: "stretch", marginTop: 8, marginBottom: 2 },
  input: { marginTop: 6, fontSize: 24, color: C.text, textAlign: "center", backgroundColor: "#FFF8EA", borderRadius: 16, borderWidth: 2, borderColor: C.honey, paddingVertical: 8, paddingHorizontal: 12 },
  head: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  nectarHint: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFE6F0", borderRadius: 16, padding: 10, marginBottom: 10 },
  lvlBadge: { position: "absolute", left: 8, top: 8, backgroundColor: C.jelly, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  upDot: { position: "absolute", right: 8, top: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  jellyHint: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F1E8FF", borderRadius: 16, padding: 10, marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 12 },
  beeBg: { height: 104, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ownedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  costTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-start", backgroundColor: "#F1E8FF", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  detailBg: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center", marginTop: 4 },
  ability: { backgroundColor: "#F1E8FF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 10 },
});
