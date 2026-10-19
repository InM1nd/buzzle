/**
 * v1.4 Settings: one calm sheet with grouped cards (Game · Reminders · Updates · Progress · More) and two
 * sub-pages (Update, About). "Simply pleasant": few words, one action per row, nothing destructive by accident.
 */
import React, { useEffect, useRef, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { addBackListener } from "../platform/back";
import { useInsets } from "../platform/insets";
import { Lang, numFmt, t } from "../i18n";
import { GameState, Settings, TILE_STYLES, UI_STYLES } from "../logic/game";
import { changelogText } from "../logic/update";
import { CAN_PICK_FILE, exportSaveCode, inviteFriend, pickSaveFile } from "../platform/share";
import { inTelegram, NOTIFICATIONS_SUPPORTED } from "../platform/telegram";
import { downloadApk, installApk, openInstallPermission } from "../platform/updater";
import { ART, seasonalTiles, TILE_SETS } from "../ui/art";
import { activeEvent } from "../logic/event";
import { today } from "../logic/game";
import { Mascot } from "../ui/BeeSprite";
import { Bar, CloseBtn, GameButton, Glow, Overlay, Press, Txt } from "../ui/components";
import { activeCard, C, F, isNight, K, themed } from "../ui/theme";
import { Toggle } from "../ui/Toggle";
import { Updater } from "../ui/useUpdater";
import { APP_VERSION, APP_VERSION_CODE, GITHUB_URL, PRIVACY_URL } from "../version";
import { LANG_NAME } from "./LanguagePicker";

type Page = "main" | "update" | "about";
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export interface SettingsProps {
  visible: boolean; s: GameState; notifBlocked: boolean; updater: Updater;
  onSet: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  /** dev build: developer switches */
  dev?: boolean;
  onLang: (l: Lang) => void;
  onNotifications: (v: boolean) => void;
  onTutorial: () => void; onWhatsNew: () => void; onReset: () => void; onClose: () => void;
  onInvite?: () => void;
  getCode: () => string; onImport: (code: string) => string | null;
  /** open straight on a page (the update badge opens "update") */
  startPage?: Page;
}

export function SettingsModal(p: SettingsProps) {
  const [page, setPage] = useState<Page>("main");
  useEffect(() => { if (p.visible) setPage(p.startPage ?? "main"); }, [p.visible, p.startPage]);
  const { height } = useWindowDimensions();
  const insets = useInsets();
  // hardware / Telegram back: a sub-page goes back to the main list first, then settings close
  const pageRef = useRef(page); pageRef.current = page;
  useEffect(() => {
    if (!p.visible) return;
    const sub = addBackListener(() => { if (pageRef.current !== "main") { setPage("main"); return true; } p.onClose(); return true; });
    return () => sub.remove();
  }, [p.visible, p.onClose]);
  const sub = page !== "main";
  return (
    !p.visible ? null :
    <View style={[styles.page, { paddingTop: insets.top + 10 }]}>
      <View accessibilityLabel={t("st.title")} style={{ flex: 1 }}>
        <View style={styles.head}>
          {sub ? (
            <Press onPress={() => setPage("main")} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel={t("c.back")} scaleTo={0.88}>
              <Text style={[F.black, { fontSize: 26, lineHeight: 28, color: C.honeyDark, marginTop: -3 }]}>‹</Text>
            </Press>
          ) : null}
          <Txt v="h1" style={{ flex: 1 }} numberOfLines={1}>{page === "about" ? t("ab.title") : page === "update" ? t("up.title") : t("st.title")}</Txt>
          <Press onPress={p.onClose} hitSlop={12} style={styles.closeX} accessibilityRole="button" accessibilityLabel={t("c.close")} scaleTo={0.88}>
            <Image source={ART.close} style={{ width: 16, height: 16, tintColor: C.brown }} />
          </Press>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {page === "main" ? <Main {...p} go={setPage} /> : page === "update" ? <UpdatePage u={p.updater} /> : <About />}
        </ScrollView>
      </View>
    </View>
  );
}

function Main(p: SettingsProps & { go: (pg: Page) => void }) {
  const st = p.s.settings;
  const [reset, setReset] = useState(0);
  const [imp, setImp] = useState<null | string>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (!p.visible) { setReset(0); setImp(null); setMsg(null); } }, [p.visible]);
  const doExport = async () => {
    const r = await exportSaveCode(p.getCode());
    setMsg(r === "failed" ? { ok: false, text: t("st.expFail") } : r === "dismissed" ? null
      : { ok: true, text: r === "downloaded" ? t("st.expFile") : r === "copied" ? t("st.expCopied") : t("st.expSent") });
  };
  const doImport = (code: string) => {
    const err = p.onImport(code);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: t("st.loaded") });
    if (!err) setImp(null);
  };
  const tg = inTelegram();
  const on = st.notifications;
  const halloween = !!activeEvent(today(p.s, Date.now()));
  return (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      {/* game */}
      <Group title={t("st.gGame")}>
        <Txt v="h3" style={{ marginBottom: 8 }}>{t("st.language")}</Txt>
        <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={t("st.language")}>
          {(["en", "uk", "ru"] as Lang[]).map((l) => (
            <Press key={l} onPress={() => p.onLang(l)} scaleTo={0.96} style={[styles.segBtn, st.lang === l && styles.segOn]}
              accessibilityRole="radio" accessibilityState={{ checked: st.lang === l }} aria-checked={st.lang === l} accessibilityLabel={LANG_NAME[l]}>
              <Txt v="small" style={F.black} color={st.lang === l ? (isNight() ? C.onBtn : "#fff") : C.brown} numberOfLines={1}>{LANG_NAME[l]}</Txt>
            </Press>
          ))}
        </View>
        <Txt v="h3" style={{ marginTop: 14, marginBottom: 2 }}>{t("st.uiStyle")}</Txt>
        <Txt v="tiny" color={C.dim} style={{ marginBottom: 8 }}>{t("st.uiStyleSub")}</Txt>
        <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={t("st.uiStyle")}>
          {UI_STYLES.map((k) => (
            <Press key={k} onPress={() => p.onSet("ui", k)} scaleTo={0.96} style={[styles.segBtn, st.ui === k && styles.segOn]}
              accessibilityRole="radio" accessibilityState={{ checked: st.ui === k }} aria-checked={st.ui === k} accessibilityLabel={t(`st.ui.${k}`)}>
              <Txt v="small" style={F.black} color={st.ui === k ? (isNight() ? C.onBtn : "#fff") : C.brown} numberOfLines={1}>{t(`st.ui.${k}`)}</Txt>
            </Press>
          ))}
        </View>
        <Txt v="h3" style={{ marginTop: 14, marginBottom: 2 }}>{t("st.tiles")}</Txt>
        <Txt v="tiny" color={C.dim} style={{ marginBottom: 8 }}>{t("st.tilesSub")}{halloween ? ` ${t("st.tilesEvent")}` : ""}</Txt>
        <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel={t("st.tiles")}>
          {TILE_STYLES.filter((k) => p.dev || (k !== "balanced" && k !== "faceted")).map((k) => {
            const on = st.tiles === k;
            return (
              <Press key={k} onPress={() => p.onSet("tiles", k)} scaleTo={0.96} style={[styles.tileOpt, on && styles.tileOn]}
                accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t(`st.tiles.${k}`)}>
                <Glow on={on} radius={16} />
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {[0, 1, 3, 4].map((c) => <Image key={c} source={TILE_SETS[seasonalTiles(k, halloween)].cells[c]} style={{ width: 30, height: 26 }} />)}
                </View>
                <Txt v="small" style={F.black} color={on ? C.text : C.brown} numberOfLines={1}>{t(`st.tiles.${k}`)}</Txt>
              </Press>
            );
          })}
        </View>
        {p.dev ? (
          <Row title={t("st.devEvent")} sub={t("st.devEventSub")}><Toggle value={st.devEvent} onChange={(v) => p.onSet("devEvent", v)} label={t("st.devEvent")} /></Row>
        ) : null}
        <Row title={t("st.sound")} sub={t("st.soundSub")}><Toggle value={st.sound} onChange={(v) => p.onSet("sound", v)} label={t("st.sound")} /></Row>
        <Row title={t("st.vibration")} sub={t("st.vibrationSub")} last><Toggle value={st.haptics} onChange={(v) => p.onSet("haptics", v)} label={t("st.vibration")} /></Row>
      </Group>

      {/* reminders */}
      <Group title={t("st.gNotif")}>
        {NOTIFICATIONS_SUPPORTED ? (
          <>
            <Row title={t("st.reminders")} sub={t("st.remindersSub")} last={!on}><Toggle value={on} onChange={p.onNotifications} label={t("st.reminders")} /></Row>
            {on ? (
              <>
                <Row title={t("st.nHive")} small><Toggle value={st.notifHive} onChange={(v) => p.onSet("notifHive", v)} label={t("st.nHive")} /></Row>
                <Row title={t("st.nDaily")} small><Toggle value={st.notifDaily} onChange={(v) => p.onSet("notifDaily", v)} label={t("st.nDaily")} /></Row>
                <Row title={t("st.nGarden")} small><Toggle value={st.gardenReminders} onChange={(v) => p.onSet("gardenReminders", v)} label={t("st.nGarden")} /></Row>
                <Row title={t("st.nChests")} small><Toggle value={st.notifChests} onChange={(v) => p.onSet("notifChests", v)} label={t("st.nChests")} /></Row>
                <Row title={t("st.quiet")} sub={st.quietOn ? t("st.quietSub", { a: hh(st.quietFrom), b: hh(st.quietTo) }) : undefined} last={!st.quietOn}>
                  <Toggle value={st.quietOn} onChange={(v) => p.onSet("quietOn", v)} label={t("st.quiet")} />
                </Row>
                {st.quietOn ? (
                  <View style={{ flexDirection: "row", gap: 8, paddingTop: 8 }}>
                    <Stepper label={t("st.from")} value={st.quietFrom} onChange={(v) => p.onSet("quietFrom", v)} />
                    <Stepper label={t("st.to")} value={st.quietTo} onChange={(v) => p.onSet("quietTo", v)} />
                  </View>
                ) : null}
              </>
            ) : null}
            {p.notifBlocked ? (
              <Press onPress={() => Linking.openSettings().catch(() => {})} style={{ marginTop: 8 }}>
                <Txt v="small" color={C.red}>{t("st.notifBlocked")}</Txt>
              </Press>
            ) : null}
          </>
        ) : <Txt v="small" color={C.dim}>{t("st.notifWeb")}</Txt>}
      </Group>

      {/* v1.5: invite moved here from Surprises */}
      {p.onInvite ? (
        <Group title={t("ls.invite")}>
          <LinkRow title={t("ls.invite")} onPress={p.onInvite} last />
        </Group>
      ) : null}

      {/* updates */}
      <Group title={t("st.gUpdates")}>
        {p.updater.enabled ? (
          <>
            <Press onPress={() => p.go("update")} style={styles.link} accessibilityRole="button" accessibilityLabel={t("st.check")}>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t("st.check")}</Txt>
                <Txt v="small" color={p.updater.available ? C.greenDark : C.dim}>
                  {p.updater.available && p.updater.latest ? t("up.available", { v: p.updater.latest.version }) : t("up.current", { v: APP_VERSION })}
                </Txt>
              </View>
              {p.updater.available ? <View style={styles.dotBadge} /> : null}
              <Txt v="h2" color={C.faint}>›</Txt>
            </Press>
            <Row title={t("st.autoCheck")} sub={t("st.autoCheckSub")}><Toggle value={st.autoUpdate} onChange={(v) => p.onSet("autoUpdate", v)} label={t("st.autoCheck")} /></Row>
          </>
        ) : <Txt v="small" color={C.dim} style={{ marginBottom: 6 }}>{tg ? t("st.tgUpdates") : t("up.current", { v: APP_VERSION })}</Txt>}
        <Press onPress={p.onWhatsNew} style={[styles.link, { borderBottomWidth: 0 }]} accessibilityRole="button" accessibilityLabel={t("st.whatsNew")}>
          <Txt v="h3" style={{ flex: 1 }}>{t("st.whatsNew")}</Txt>
          <Txt v="h2" color={C.faint}>›</Txt>
        </Press>
      </Group>

      {/* progress */}
      <Group title={t("st.gSave")}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <GameButton small title={t("st.export")} icon={ART.save} color="white" onPress={doExport} style={{ flex: 1 }} label={t("st.exportLabel")} />
          <GameButton small title={t("st.import")} color="white" onPress={() => { setImp(imp === null ? "" : null); setMsg(null); }} style={{ flex: 1 }} label={t("st.importLabel")} />
        </View>
        {imp !== null ? (
          <View style={{ marginTop: 8 }}>
            <TextInput value={imp} onChangeText={setImp} placeholder={t("st.paste")} placeholderTextColor="#C9AE86" multiline autoCorrect={false} autoCapitalize="none"
              accessibilityLabel={t("st.codeLabel")} style={[F.xbold, styles.code]} />
            <Txt v="tiny" color={C.dim}>{t("st.replaceWarn")}</Txt>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {CAN_PICK_FILE ? <GameButton small title={t("st.fromFile")} color="white" style={{ flex: 1 }} onPress={async () => { const c = await pickSaveFile(); if (c) doImport(c); }} /> : null}
              <GameButton small title={t("st.load")} color="honey" disabled={!imp.trim()} style={{ flex: 1 }} onPress={() => doImport(imp)} label={t("st.loadLabel")} />
            </View>
          </View>
        ) : null}
        {msg ? <Txt v="small" color={msg.ok ? C.greenDark : C.red} style={{ marginTop: 6 }}>{msg.text}</Txt> : null}
        <Row title={t("st.account")} sub={t("st.accountSub")} last>
          <View style={styles.soon}><Txt v="small" color={C.dim}>{t("st.soon")}</Txt></View>
        </Row>
        <Txt v="tiny" color={C.faint}>{tg ? t("st.savedTg") : t("st.savedLocal")}</Txt>
      </Group>

      {/* more */}
      <Group title={t("st.gMore")}>
        <LinkRow title={t("st.tutorial")} onPress={p.onTutorial} />
        <LinkRow title={t("st.about")} onPress={() => p.go("about")} last />
      </Group>

      {/* reset: two confirmations */}
      <View style={{ gap: 8 }}>
        {reset > 0 ? <Txt v="small" color={C.red} center>{reset === 1 ? t("st.reset1") : t("st.reset2")}</Txt> : null}
        <GameButton small title={reset === 0 ? t("st.reset") : reset === 1 ? t("st.reset1") : reset === 2 ? t("st.reset2") : t("st.resetting")}
          color={reset ? "honey" : "white"} label={t("st.reset")}
          onPress={() => { if (reset < 2) setReset(reset + 1); else { setReset(3); p.onReset(); } }} />
        {reset > 0 && reset < 3 ? <GameButton small title={t("st.resetCancel")} color="green" onPress={() => setReset(0)} /> : null}
      </View>
      <Txt v="tiny" color={C.faint} center>{t("st.version", { v: APP_VERSION })}</Txt>
    </View>
  );
}

// ---------------------------------------------------------------- update page
type Phase = "idle" | "downloading" | "ready" | "dlerror";
function UpdatePage({ u }: { u: Updater }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prog, setProg] = useState(0);
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => { u.check().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rel = u.latest;
  const download = async () => {
    if (!rel) return;
    setPhase("downloading"); setProg(0);
    try {
      const f = await downloadApk(rel, setProg);
      setPath(f); setPhase("ready");
      installApk(f).catch(() => {});
    } catch { setPhase("dlerror"); }
  };
  if (u.checking && !rel) return <View style={styles.center}><Mascot id="zhuzha" size={90} seed={1} /><Txt v="body" color={C.dim} center>{t("up.checking")}</Txt></View>;
  if (u.error && !rel) return (
    <View style={styles.center}>
      <Txt v="body" color={C.red} center>{t("up.error")}</Txt>
      <GameButton small title={t("up.retry")} color="white" onPress={() => { u.check().catch(() => {}); }} style={{ marginTop: 10, alignSelf: "stretch" }} />
    </View>
  );
  if (!u.available || !rel) return (
    <View style={styles.center}>
      <Mascot id="zhuzha" size={90} seed={2} />
      <Txt v="h3" center>{t("up.latest", { v: APP_VERSION })}</Txt>
      <Txt v="tiny" color={C.faint} center>{APP_VERSION} ({APP_VERSION_CODE})</Txt>
    </View>
  );
  const mb = rel.apkSize ? numFmt(Math.round(rel.apkSize / 1e5) / 10) : "?";
  return (
    <View style={{ gap: 10 }} accessibilityLabel={t("up.available", { v: rel.version })}>
      <View style={styles.relHead}>
        <Image source={ART.chest} style={{ width: 54, height: 54 }} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" color={C.greenDark}>{t("up.available", { v: rel.version })}</Txt>
          <Txt v="small" color={C.dim}>{t("up.current", { v: APP_VERSION })}</Txt>
        </View>
      </View>
      <Txt v="tiny" color={C.dim}>{t("up.changes")}</Txt>
      <View style={styles.notes}><Txt v="small" color={C.text} style={{ lineHeight: 19 }}>{changelogText(rel.body)}</Txt></View>
      {phase === "downloading" ? (
        <View style={{ gap: 6 }}>
          <Bar progress={prog} height={14} color={C.green} />
          <Txt v="small" color={C.dim} center>{t("up.downloading", { p: Math.round(prog * 100) })}</Txt>
        </View>
      ) : phase === "ready" && path ? (
        <GameButton title={t("up.install")} color="green" onPress={() => { installApk(path).catch(() => {}); }} />
      ) : rel.apkUrl ? (
        <GameButton title={t("up.download", { mb })} color="green" onPress={download} />
      ) : null}
      {phase === "dlerror" ? <Txt v="small" color={C.red} center>{t("up.dlError")}</Txt> : null}
      <View style={styles.perm}>
        <Txt v="h3" style={{ fontSize: 15 }}>{t("up.permTitle")}</Txt>
        <Txt v="small" color={C.dim} style={{ marginTop: 2 }}>{t("up.permText")}</Txt>
        <Press onPress={() => { openInstallPermission().catch(() => {}); }} style={{ marginTop: 6 }} accessibilityRole="button">
          <Txt v="small" color={C.honeyDark} style={F.black}>{t("up.openPerm")} →</Txt>
        </Press>
      </View>
      {rel.page ? (
        <Press onPress={() => Linking.openURL(rel.page).catch(() => {})} accessibilityRole="link">
          <Txt v="small" color={C.dim} center>{t("up.openRelease")}</Txt>
        </Press>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- about
function About() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center" }}>
        <Mascot id="zhuzha" size={110} seed={5} />
        <Txt v="h2" center>Buzzle</Txt>
        <Txt v="small" color={C.dim} center>{t("ab.version", { v: APP_VERSION, c: APP_VERSION_CODE })}</Txt>
      </View>
      <Txt v="body" color={C.text} center>{t("ab.blurb")}</Txt>
      <Group>
        <LinkRow title={t("ab.github")} onPress={() => Linking.openURL(GITHUB_URL).catch(() => {})} />
        <LinkRow title={t("ab.privacy")} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} last />
      </Group>
      <Group title={t("ab.credits").toUpperCase()}>
        <Txt v="small" color={C.dim} style={{ lineHeight: 19 }}>{t("ab.creditsText")}</Txt>
      </Group>
    </View>
  );
}

// ---------------------------------------------------------------- bits
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View>
      {title ? <Txt v="tiny" color={C.dim} style={{ marginLeft: 6, marginBottom: 4 }}>{title}</Txt> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}
function Row({ title, sub, children, last, small }: { title: string; sub?: string; children: React.ReactNode; last?: boolean; small?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }, small && { paddingVertical: 6, paddingLeft: 10 }]}>
      <View style={{ flex: 1 }}>
        <Txt v={small ? "body" : "h3"}>{title}</Txt>
        {sub ? <Txt v="small" color={C.dim}>{sub}</Txt> : null}
      </View>
      {children}
    </View>
  );
}
function LinkRow({ title, onPress, last }: { title: string; onPress: () => void; last?: boolean }) {
  return (
    <Press onPress={onPress} style={[styles.link, last && { borderBottomWidth: 0 }]} accessibilityRole="button" accessibilityLabel={title}>
      <Txt v="h3" style={{ flex: 1 }}>{title}</Txt>
      <Txt v="h2" color={C.faint}>›</Txt>
    </Press>
  );
}
function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`${label} ${hh(value)}`}>
      <Txt v="tiny" color={C.dim}>{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Press onPress={() => onChange((value + 23) % 24)} hitSlop={8} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} −1`}><Txt v="h3" color={C.brown}>−</Txt></Press>
        <Txt v="h3" style={{ minWidth: 52, textAlign: "center" }}>{hh(value)}</Txt>
        <Press onPress={() => onChange((value + 1) % 24)} hitSlop={8} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} +1`}><Txt v="h3" color={C.brown}>+</Txt></Press>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 50, elevation: 50, backgroundColor: C.bg, paddingTop: 44, paddingHorizontal: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  closeX: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#fff"), borderWidth: 2, borderColor: K.bd("#F1DFC0") },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#FFF1D2") },
  group: { backgroundColor: K.bg("#fff"), borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: K.bd("#F3E3C4") },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  link: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  seg: { flexDirection: "row", backgroundColor: K.bg("#F6E3BF"), borderRadius: 14, padding: 3, gap: 3, marginBottom: 4 },
  segBtn: { flex: 1, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  segOn: { backgroundColor: C.honeyDeep },
  soon: { backgroundColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  code: { minHeight: 70, maxHeight: 120, fontSize: 12, color: C.text, backgroundColor: K.bg("#FFF8EA"), borderRadius: 14, borderWidth: 2, borderColor: C.honey, padding: 8, textAlignVertical: "top" },
  stepper: { flex: 1, backgroundColor: K.bg("#fff"), borderRadius: 14, padding: 8, alignItems: "center", gap: 2, ...(isNight() ? { borderWidth: 1.5, borderColor: C.cardEdge } : null) },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: K.bg("#FFF1D2"), alignItems: "center", justifyContent: "center" },
  dotBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  center: { alignItems: "center", gap: 8, paddingVertical: 18 },
  relHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  notes: { backgroundColor: K.bg("#FFF9EE"), borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: K.bd("#F3E3C4") },
  perm: { backgroundColor: K.bg("#F3EDFF"), borderRadius: 14, padding: 12 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  tileOpt: { flexBasis: "47%", flexGrow: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 16, borderWidth: 2, borderColor: C.line, backgroundColor: K.bg("#fff") },
  tileOn: isNight() ? { backgroundColor: "#2A2160", ...activeCard() } : { borderColor: C.green, backgroundColor: "#E4F7EA" },
}));
