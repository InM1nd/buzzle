/**
 * v1.4 language picker: shown on the first launch (default English; in Telegram the account language is
 * pre-selected as a suggestion) and once for players updating from ≤1.3 (pre-selected Russian, their old language).
 * Nothing is applied until the player taps Continue.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getLang, Lang, LANGS, setLang } from "../i18n";
import { render } from "../i18n/core";
import { STRINGS } from "../i18n";
import { Mascot } from "../ui/BeeSprite";
import { GameButton, Press, Txt } from "../ui/components";
import { C, F, K, themed, isNight } from "../ui/theme";

export const LANG_NAME: Record<Lang, string> = { en: "English", uk: "Українська", ru: "Русский" };
const HELLO: Record<Lang, string> = { en: "Hello, beekeeper!", uk: "Привіт, пасічнику!", ru: "Привет, пчеловод!" };

export function LanguageList({ value, onChange, suggested }: { value: Lang; onChange: (l: Lang) => void; suggested?: Lang | null }) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
      {LANGS.map((l) => {
        const on = l === value;
        return (
          <Press key={l} onPress={() => onChange(l)} scaleTo={0.97} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={LANG_NAME[l]}
            style={[styles.opt, on && styles.optOn]}>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Txt v="h3" style={F.black}>{LANG_NAME[l]}</Txt>
              <Txt v="small" color={C.dim}>{HELLO[l]}{suggested === l ? ` · ${render(STRINGS["lang.suggest"], l)}` : ""}</Txt>
            </View>
          </Press>
        );
      })}
    </View>
  );
}

export default function LanguagePicker({ initial, suggested, onDone }: { initial: Lang; suggested: Lang | null; onDone: (l: Lang) => void }) {
  const [sel, setSel] = useState<Lang>(initial);
  // the picker itself speaks the selected language, so the player sees what they get
  const shown = sel;
  useEffect(() => { /* no global change until Continue */ }, []);
  const tl = (k: keyof typeof STRINGS) => render(STRINGS[k], shown);
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} accessibilityLabel={tl("lang.title")}>
      <View style={styles.card}>
        <View style={{ alignItems: "center" }}><Mascot id="zhuzha" size={120} seed={3} /></View>
        <Txt v="h1" center style={{ marginTop: 4 }}>{tl("lang.title")}</Txt>
        <Txt v="small" color={C.dim} center style={{ marginTop: 4, marginBottom: 16 }}>{tl("lang.sub")}</Txt>
        <LanguageList value={sel} onChange={setSel} suggested={suggested} />
        <GameButton title={tl("lang.ok")} color="green" style={{ marginTop: 18 }} onPress={() => { if (getLang() !== sel) setLang(sel); onDone(sel); }} label={tl("lang.ok")} />
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { zIndex: 80, elevation: 80, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 420, backgroundColor: K.bg("#fff"), borderRadius: 28, padding: 20, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 2, borderColor: K.bd("#F0DFC0"), backgroundColor: K.bg("#FFFBF2") },
  optOn: { borderColor: C.honeyDeep, backgroundColor: K.bg("#FFF1D2") },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: K.bd("#D9BF92"), alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: C.honeyDeep },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.honeyDeep },
}));
