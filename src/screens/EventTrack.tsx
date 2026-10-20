/** v1.6 seasonal event card (Play and Tasks tabs) with the reward track window. */
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { t, tx } from "../i18n";
import { claimable, TRACK, TrackReward } from "../logic/event";
import { beeDisplayName, eventView, GameState, treatGuest, trickGuest } from "../logic/game";
import { BeeSprite, Hover } from "../ui/BeeSprite";
import { USE_NATIVE_DRIVER } from "../ui/anim";
import { BOX_INFO } from "../logic/loot";
import { ART } from "../ui/art";
import { Bar, Bobbing, CloseBtn, FitTxt, GameButton, Overlay, Txt } from "../ui/components";
import { centerOf, Pt } from "../ui/Fly";
import { boxArt, ItemIcon } from "../ui/lootUi";
import { F, shadow, K, themed } from "../ui/theme";

/** false while the night-falls transition is due or running: the event UI appears only once the interface is in the event look */
export const EventUi = createContext(true);

const NIGHT = { bg: "#2B1B3D", card: "#3A2F5B", pumpkin: "#F08A24", candle: "#FFC56B", ghost: "#BFF5E6" };

function rewardLook(r: TrackReward): { icon: ImageSourcePropType | null; skin?: string; title: string } {
    if (r.skin) return { icon: null, skin: r.skin, title: `${t("ev.costume")}: ${tx(`item.${r.skin}`)}` + (r.box ? ` + ${BOX_INFO[r.box].name}` : "") };
  if (r.box) return { icon: boxArt(r.box), title: BOX_INFO[r.box].name };
  if (r.seeds) return { icon: ART.seed, title: t("ev.seeds", { n: r.seeds.n }) };
  if (r.jelly) return { icon: ART.jelly, title: `+${r.jelly}` };
  return { icon: ART.honey, title: `+${r.honey ?? 0}` };
}

export function EventCard({ s, now, onClaim }: { s: GameState; now: number; onClaim: (from: Pt | null) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<View>(null);
  const shown = useContext(EventUi);
  const v = eventView(s, now);
  if (!shown || !v) return null;
  const e = v.progress;
  const next = TRACK[e.claimed];
  const ready = claimable(e);
  const prevAt = e.claimed > 0 ? TRACK[e.claimed - 1].at : 0;
  const progress = next ? (e.points - prevAt) / (next.at - prevAt) : 1;
  return (
    <View style={[styles.card, shadow]}>
      <BannerArt style={styles.header} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Bobbing amp={3}><Image source={ART.pumpkin} style={{ width: 58, height: 50 }} /></Bobbing>
        <View style={{ flex: 1, minWidth: 0 }}>
          <FitTxt v="h2" color="#fff" text={t("ev.title")} base={21} chars={12} />
          <Txt v="small" color={NIGHT.candle}>{v.running ? t("ev.daysLeft", { n: v.daysLeft }) : t("ev.ended")}</Txt>
        </View>
        <View style={styles.points}>
          <Image source={ART.point} style={{ width: 24, height: 24 }} />
          <Txt v="h3" color="#fff">{e.points}</Txt>
        </View>
      </View>
      {v.running ? <Txt v="tiny" color={NIGHT.ghost} style={{ marginTop: 8 }}>{t("ev.sub")}</Txt> : null}
      <View style={{ marginTop: 10 }}>
        <Bar progress={Math.min(1, progress)} height={10} color={NIGHT.pumpkin} track="rgba(255,255,255,0.15)" />
        <Txt v="tiny" color={NIGHT.candle} style={{ marginTop: 4 }}>
          {next ? (ready ? t("ev.points", { n: e.points }) : t("ev.next", { n: next.at - e.points })) : t("ev.done")}
        </Txt>
      </View>
      <View ref={btn} collapsable={false}>
        <GameButton small title={ready ? t("ev.claimN", { n: ready }) : t("ev.open")} color={ready ? "green" : "white"} style={{ marginTop: 10 }}
          onPress={() => setOpen(true)} label={t("ev.track")} />
      </View>
      <Overlay visible={open} onClose={() => setOpen(false)}>
        <CloseBtn onPress={() => setOpen(false)} />
        {/* night banner with the running total */}
        <View style={styles.trackHead}>
          <BannerArt style={styles.trackHeadImg} />
          <View style={[styles.points, { position: "absolute", left: 12, top: 10 }]}>
            <Image source={ART.point} style={{ width: 18, height: 18 }} />
            <Txt v="h3" color="#fff" style={{ fontSize: 15, lineHeight: 19 }}>{e.points}</Txt>
          </View>
          <Txt v="h2" color="#fff" numberOfLines={1} style={{ fontSize: 20, lineHeight: 25 }}>{t("ev.track")}</Txt>
        </View>
        <Txt v="tiny" color={K.fg("#8A5200")} style={{ marginTop: 8, marginBottom: 4 }}>{t("ev.how")}</Txt>
        <View>
          {TRACK.map((st, i) => {
            const look = rewardLook(st.reward);
            const done = i < e.claimed, reached = e.points >= st.at, isNext = i === e.claimed;
            const ready = isNext && reached;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "stretch" }}>
                {/* the track: a line through point nodes, lit up to the current total */}
                <View style={styles.rail}>
                  <View style={[styles.railLine, i === 0 && { top: "50%" }, i === TRACK.length - 1 && { bottom: "50%" }, reached && { backgroundColor: NIGHT.pumpkin }]} />
                  <View style={[styles.node, reached && styles.nodeOn]}>
                    <Txt v="tiny" color={reached ? "#fff" : K.fg("#8A6B4A")} style={{ fontSize: 11 }}>{st.at}</Txt>
                  </View>
                </View>
                <View style={[styles.step, done && styles.stepDone, ready && styles.stepReady, isNext && !reached && styles.stepNext]}>
                  {look.skin ? <ItemIcon id={look.skin} size={34} /> : <Image source={look.icon!} style={{ width: 34, height: 34, opacity: reached ? 1 : 0.55 }} resizeMode="contain" />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt v="h3" style={{ fontSize: 13, lineHeight: 16 }} numberOfLines={2}>{look.title}</Txt>
                    {isNext && !reached ? (
                      <>
                        <Bar progress={Math.min(1, progress)} height={6} color={NIGHT.pumpkin} style={{ marginTop: 4 }} />
                        <Txt v="tiny" color={K.fg("#C25E00")} style={{ marginTop: 2 }}>{t("ev.next", { n: st.at - e.points })}</Txt>
                      </>
                    ) : null}
                  </View>
                  {done ? <Image source={ART.check} style={{ width: 26, height: 26 }} />
                    : ready ? (
                      <GameButton small title={t("ev.claim")} color="green" style={{ width: 76, minWidth: 0, flexShrink: 0 }} label={`${t("ev.claim")}: ${look.title}`}
                        onPress={async () => onClaim(await centerOf(btn.current))} />
                    ) : <Image source={ART.lock} style={{ width: 20, height: 20, opacity: 0.5 }} />}
                </View>
              </View>
            );
          })}
        </View>
      </Overlay>
    </View>
  );
}

/** v1.6 trick or treat: once a day a guest in a costume knocks at the hive. The banner opens the big window; the window keeps
 *  its guest after the treat (trickGuest() is null by then) until it is closed. */
export function TrickBanner({ s, now, onTreat }: { s: GameState; now: number; onTreat: (from: Pt | null) => void }) {
  const g = trickGuest(s, now);
  const [guest, setGuest] = useState<{ bee: string; skin: string } | null>(null);
  const [visit, setVisit] = useState(0);
  const shown = useContext(EventUi);
  return (
    <>
      {g && shown ? (
        <View style={styles.trick}>
          {/* a calm night pill: the guest in a glowing round window · "Knock knock!" with who it is · +5 chip · one honey button */}
          <View style={styles.trickWin}>
            <Bobbing amp={2}><BeeSprite id={g.bee} skin={g.skin} size={32} flap={false} /></Bobbing>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Txt v="h3" color="#fff" numberOfLines={1} style={{ fontSize: 15, lineHeight: 19, flexShrink: 1 }}>{t("ev.knock")}</Txt>
              <View style={styles.trickPts} accessibilityLabel={t("ev.trickPts")}>
                <Image source={ART.point} style={{ width: 13, height: 13 }} />
                <Txt v="tiny" color={NIGHT.candle} style={[F.black, { fontSize: 11, lineHeight: 14 }]}>+5</Txt>
              </View>
            </View>
            <Txt v="tiny" color={NIGHT.ghost} numberOfLines={1}>{t("ev.trickWho")}</Txt>
          </View>
          <GameButton small title={t("ev.trickBtn")} color="honey" style={{ minWidth: 0, flexShrink: 0 }} onPress={() => { setGuest(g); setVisit((v) => v + 1); }} label={`${t("ev.trickTitle")} ${t("ev.trickOpen")}`} />
        </View>
      ) : null}
      <Overlay visible={!!guest} onClose={() => setGuest(null)}>
        {guest ? <TrickWindow key={visit} s={s} now={now} guest={guest} onTreat={onTreat} onClose={() => setGuest(null)} /> : null}
      </Overlay>
    </>
  );
}

const TRICK = {
  door: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [
    require("../../assets/art/halloween/trick_door_0.webp"), require("../../assets/art/halloween/trick_door_1.webp"),
    require("../../assets/art/halloween/trick_door_2.webp"), require("../../assets/art/halloween/trick_door_3.webp"),
    require("../../assets/art/halloween/trick_door_4.webp"), require("../../assets/art/halloween/trick_door_5.webp"),
    require("../../assets/art/halloween/trick_door_6.webp"), require("../../assets/art/halloween/trick_door_7.webp"),
  ][i]),
  glow: require("../../assets/art/halloween/trick_glow.webp"),
  bg: require("../../assets/art/halloween/trick_bg.webp"),
  full: require("../../assets/art/halloween/trick_basket_full.webp"),
  empty: require("../../assets/art/halloween/trick_basket_empty.webp"),
  sparkle: require("../../assets/art/halloween/trick_sparkle.webp"),
  candy: [
    require("../../assets/art/halloween/trick_candy_1.webp"), require("../../assets/art/halloween/trick_candy_2.webp"),
    require("../../assets/art/halloween/trick_candy_3.webp"), require("../../assets/art/halloween/trick_candy_4.webp"),
    require("../../assets/art/halloween/trick_candy_5.webp"), require("../../assets/art/halloween/trick_candy_6.webp"),
  ],
};
/** door canvas (1024²) layout from design/2d/halloween/trick/door_layout.json */
const APERTURE = { x: 337, y: 332, w: 345, h: 428 };
type Phase = "knock" | "open" | "guest" | "treat" | "done";

/** knock knock → the door opens frame by frame → the guest peeks out → treat: candies fly from the basket, sparkles, reward */
function TrickWindow({ s, now, guest, onTreat, onClose }: { s: GameState; now: number; guest: { bee: string; skin: string }; onTreat: (from: Pt | null) => void; onClose: () => void }) {
  const [W, setW] = useState(0);
  const [phase, setPhase] = useState<Phase>("knock");
  const [frame, setFrame] = useState(0);
  const guestRef = useRef<View>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const fly = useRef(TRICK.candy.map(() => new Animated.Value(0))).current;
  // read the reward up front (treatGuest is pure); App commits it in onTreat
  const reward = useRef(treatGuest(s, now)).current;
  const D = W * 0.84, H = W * 0.92, k = D / 1024;
  const doorL = (W - D) / 2, doorT = H - D * 0.99;
  const ap = { left: doorL + APERTURE.x * k, top: doorT + APERTURE.y * k, width: APERTURE.w * k, height: APERTURE.h * k };
  const bs = APERTURE.w * k * 1.05; // guest size
  const basket = W * 0.3;
  const from = { x: basket * 0.5, y: H - basket * 0.55 }, to = { x: ap.left + ap.width / 2, y: ap.top + ap.height - bs * 0.45 };

  useEffect(() => {
    if (!W) return;
    const knock = (d: number) => Animated.sequence([
      Animated.delay(d),
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    let timer: ReturnType<typeof setInterval> | null = null;
    Animated.sequence([knock(250), knock(130), knock(130), Animated.delay(220)]).start(({ finished }) => {
      if (!finished) return;
      setPhase("open");
      let f = 0;
      timer = setInterval(() => {
        f++;
        setFrame(f);
        if (f < 7) return;
        if (timer) clearInterval(timer);
        setPhase("guest");
        Animated.spring(rise, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 7, bounciness: 9 }).start();
        Animated.loop(Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: USE_NATIVE_DRIVER }),
        ])).start();
      }, 75);
    });
    return () => { if (timer) clearInterval(timer); shake.stopAnimation(); glow.stopAnimation(); };
  }, [W, shake, rise, glow]);

  const treat = () => {
    if (phase !== "guest") return;
    setPhase("treat");
    Animated.stagger(80, fly.map((v) => Animated.timing(v, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }))).start(async () => {
      Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
      setPhase("done");
      onTreat(await centerOf(guestRef.current));
    });
  };

  const look = reward ? rewardLook(reward.reward) : null;
  const name = beeDisplayName(s, guest.bee);
  return (
    <View>
      <CloseBtn onPress={onClose} />
      <Txt v="h2" style={{ paddingRight: 44 }}>{t("ev.trickTitle")}</Txt>
      <Txt v="small" color={K.fg("#8A5200")} style={{ marginBottom: 10 }}>
        {phase === "done" ? t("ev.trickThanks", { name }) : phase === "guest" || phase === "treat" ? t("ev.trickGuest", { name, costume: tx(`item.${guest.skin}`) }) : t("ev.trickKnock")}
      </Txt>
      <View style={[styles.scene, { height: W ? H : 300 }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Image source={TRICK.bg} resizeMode="cover" style={{ position: "absolute", width: "100%", height: "100%" }} />
        {W ? (
          <>
            <Animated.View style={{ position: "absolute", left: doorL, top: doorT, width: D, height: D, transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }, { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ["-1deg", "1deg"] }) }] }}>
              {TRICK.door.map((src, i) => <Image key={i} source={src} style={{ position: "absolute", width: D, height: D, opacity: i === frame ? 1 : 0 }} />)}
            </Animated.View>
            {/* the guest, clipped to the doorway (top corners rounded like the hexagonal opening) */}
            <View style={[styles.aperture, ap, { borderTopLeftRadius: ap.width * 0.4, borderTopRightRadius: ap.width * 0.4 }]} pointerEvents="none">
              <Animated.View ref={guestRef} collapsable={false} style={{ position: "absolute", left: (ap.width - bs) / 2, top: ap.height - bs * 0.86, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [bs, 0] }) }] }}>
                {phase !== "knock" && phase !== "open" ? (
                  <Hover amp={4} sway={3} period={1500}><BeeSprite id={guest.bee} skin={guest.skin} size={bs} turn={0.5} /></Hover>
                ) : null}
              </Animated.View>
            </View>
            <Animated.Image source={TRICK.glow} style={{ position: "absolute", left: doorL, top: doorT, width: D, height: D, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] }) }} />
            {phase === "knock" ? <Txt v="h2" color="#fff" style={[styles.knock, { top: doorT + D * 0.18 }]}>{t("ev.knock")}</Txt> : null}
            <Image source={phase === "done" ? TRICK.empty : TRICK.full} style={{ position: "absolute", left: 0, top: H - basket, width: basket, height: basket }} />
            {fly.map((v, i) => {
              const dx = to.x - from.x + (i - 2.5) * 10, dy = to.y - from.y;
              const c = W * 0.16;
              return (
                <Animated.Image key={i} source={TRICK.candy[i]} style={{
                  position: "absolute", left: from.x - c / 2, top: from.y - c / 2, width: c, height: c,
                  opacity: v.interpolate({ inputRange: [0, 0.02, 0.85, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                    { translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy / 2 - H * 0.28 - i * 4, dy] }) },
                    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${i % 2 ? -300 : 300}deg`] }) },
                    { scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.1, 0.5] }) },
                  ],
                }} />
              );
            })}
            <Animated.Image source={TRICK.sparkle} style={{
              position: "absolute", left: to.x - W * 0.3, top: to.y - W * 0.3, width: W * 0.6, height: W * 0.6,
              opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
              transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }],
            }} />
          </>
        ) : null}
      </View>
      {phase === "done" && reward && look ? (
        <View style={styles.trickRew}>
          <View style={styles.rewChip}><Image source={ART.point} style={{ width: 22, height: 22 }} /><Txt v="h3">+{reward.points}</Txt></View>
          <View style={styles.rewChip}>
            {look.icon ? <Image source={look.icon} style={{ width: 24, height: 24 }} resizeMode="contain" /> : null}
            <Txt v="h3" numberOfLines={1}>{look.title}</Txt>
          </View>
        </View>
      ) : null}
      {phase === "done"
        ? <GameButton title={t("ev.trickDone")} color="green" onPress={onClose} style={{ marginTop: 12 }} />
        : <GameButton title={t("ev.treat")} icon={TRICK.full} color="honey" disabled={phase !== "guest"} onPress={treat} style={{ marginTop: 12 }} label={t("ev.treat")} />}
    </View>
  );
}

/** v1.6: once per event, on the first visit while it runs */
export function EventIntro({ visible, daysLeft, onClose, onGo }: { visible: boolean; daysLeft: number; onClose: () => void; onGo: () => void }) {
  const rows: [ImageSourcePropType, string][] = [
    [ART.pumpkin, t("ev.i1")], [ART.ghost, t("ev.i2")], [ART.trickBasket, t("ev.i3")], [ART.flightIcon, t("ev.i4")], [ART.point, t("ev.i5")],
  ];
  return (
    <Overlay visible={visible} onClose={onClose}>
      <CloseBtn onPress={onClose} />
      <View style={styles.introHead}>
        <BannerArt style={StyleSheet.absoluteFill} />
      </View>
      <Txt v="h1" center style={{ marginTop: 12 }}>{t("ev.title")}</Txt>
      <Txt v="small" color={K.fg("#C25E00")} center>{t("ev.introSub")} · {t("ev.daysLeft", { n: daysLeft })}</Txt>
      <View style={{ gap: 8, marginTop: 12 }}>
        {rows.map(([img, text], i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={img} style={{ width: 32, height: 32 }} resizeMode="contain" />
            <Txt v="small" style={{ flex: 1 }}>{text}</Txt>
          </View>
        ))}
      </View>
      <GameButton title={t("ev.introGo")} color="green" onPress={onGo} style={{ marginTop: 14 }} />
    </Overlay>
  );
}

/** v1.6: a harvested pumpkin became a jack-o'-lantern for the hive */
export function JackCarved({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Overlay visible={!!id} onClose={onClose}>
      {id ? (
        <View style={{ alignItems: "center", gap: 8 }}>
          <Bobbing amp={4}><ItemIcon id={id} size={120} /></Bobbing>
          <Txt v="h2" center>{tx(`item.${id}`)}</Txt>
          <Txt v="small" color={K.fg("#8A6B4A")} center>{t("ev.jack")}</Txt>
          <GameButton title={t("ev.jackOk")} color="green" onPress={onClose} style={{ alignSelf: "stretch", marginTop: 6 }} />
        </View>
      ) : null}
    </Overlay>
  );
}

/** the Pumpkin Night banner (1000×400) drawn at its own aspect ratio in a box of any shape: measured, scaled to cover,
 *  and shifted so the moon and the big pumpkins on the right (focus) stay in view. Explicit pixel sizes: Android stretched
 *  the art when it was laid out by insets alone. */
const BANNER = { w: 1000, h: 400, fx: 0.8, fy: 0.62 };
export function BannerArt({ style }: { style: object }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const k = box.w ? Math.max(box.w / BANNER.w, box.h / BANNER.h) : 0;
  const w = BANNER.w * k, h = BANNER.h * k;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const left = clamp(box.w * 0.62 - w * BANNER.fx, box.w - w, 0), top = clamp(box.h * 0.6 - h * BANNER.fy, box.h - h, 0);
  return (
    <View pointerEvents="none" style={[style, { overflow: "hidden" }]} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (width !== box.w || height !== box.h) setBox({ w: width, h: height }); }}>
      {k ? <Image source={ART.eventHeader} resizeMode="stretch" style={{ position: "absolute", left, top, width: w, height: h }} /> : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: NIGHT.bg, borderRadius: 28, padding: 16, borderWidth: 3, borderColor: NIGHT.card, overflow: "hidden" },
  // the night meadow behind the title row; the moon and pumpkins sit on the right, the text on the calm left
  // the art fills the whole card by its four insets only: Yoga resolves a percentage height against the auto-height card
  // differently on native, where "100%" left the art covering only part of it
  header: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.6 },
  points: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: NIGHT.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  step: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, marginVertical: 3, backgroundColor: K.bg("#fff"), borderRadius: 16, borderWidth: 2, borderColor: K.bd("#F0DFC0"), paddingVertical: 5, paddingHorizontal: 8 },
  stepDone: { backgroundColor: K.bg("#F6F0E4"), borderColor: K.bd("#EDE3D0") },
  stepNext: { borderColor: NIGHT.pumpkin },
  rail: { width: 34, alignItems: "center", justifyContent: "center" },
  railLine: { position: "absolute", top: 0, bottom: 0, width: 4, borderRadius: 2, backgroundColor: K.bg("#EADBC0") },
  node: { minWidth: 34, height: 24, borderRadius: 12, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: K.bg("#FFF6E3"), borderWidth: 2, borderColor: K.bd("#EADBC0") },
  nodeOn: { backgroundColor: NIGHT.pumpkin, borderColor: NIGHT.pumpkin },
  trackHead: { height: 76, borderRadius: 20, overflow: "hidden", padding: 12, paddingTop: 8, paddingRight: 44, justifyContent: "flex-end", backgroundColor: NIGHT.bg },
  trackHeadImg: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.75 },
  trick: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(32,20,48,0.92)", borderRadius: 26, paddingVertical: 6, paddingLeft: 6, paddingRight: 8, borderWidth: 1.5, borderColor: "rgba(240,138,36,0.55)" },
  trickWin: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,197,107,0.16)", borderWidth: 1.5, borderColor: "rgba(255,197,107,0.45)" },
  trickPts: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: "rgba(240,138,36,0.22)" },
  scene: { borderRadius: 22, overflow: "hidden", backgroundColor: NIGHT.bg },
  aperture: { position: "absolute", overflow: "hidden" },
  knock: { position: "absolute", left: 0, right: 0, textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 8 },
  trickRew: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 },
  rewChip: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", backgroundColor: K.bg("#FFF1D4"), borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  // full width, the close button sits on its corner (like the reward track banner)
  introHead: { height: 140, borderRadius: 20, overflow: "hidden" },
  stepReady: { borderColor: K.bd("#4CC777"), backgroundColor: K.bg("#E4F7EA") },
}));
