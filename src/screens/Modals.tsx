import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Linking, StyleSheet, View } from "react-native";
import { Reward } from "../logic/tasks";
import { ART } from "../ui/art";
import { BeeSprite, Hover, Mascot } from "../ui/BeeSprite";
import { inTelegram, NOTIFICATIONS_SUPPORTED } from "../platform/telegram";
import { C } from "../ui/theme";
import { Bobbing, CloseBtn, fmt, GameButton, Overlay, Press, Txt } from "../ui/components";
import { Toggle } from "../ui/Toggle";
import { centerOf, Pt } from "../ui/Fly";

// ---------- tutorial ----------
const SLIDES = [
  { title: "Привет, я Жужа!", text: "Добро пожаловать в «Buzzle» — уютный улей, который растёт с каждым днём." },
  { title: "Собирайте пыльцу", text: "Ведите пальцем по 3 и более соседним сотам одного цвета. Чем длиннее цепочка, тем больше очков — а из 6+ сот получается бомба." },
  { title: "Стройте улей", text: "Очки превращаются в мёд. Стройте и улучшайте соты — пчёлы собирают мёд, даже когда вы не в игре." },
  { title: "Возвращайтесь каждый день", text: "Новая головоломка дня, три задания и награды за вход. Звёзды дают маточное молочко — на него открываются новые пчёлы." },
];

function SlideArt({ i }: { i: number }) {
  if (i === 0) return <Mascot id="zhuzha" size={156} seed={4} />;
  if (i === 1) {
    const s = 34, pts = [[0, 0], [1.5, 0.866], [3, 0], [4.5, 0.866]];
    return (
      <View style={{ width: 6.5 * s, height: 3.6 * s }}>
        {pts.map(([x, y], k) => (
          <Image key={k} source={ART.cells[1]} style={{ position: "absolute", left: x * s, top: y * s + 0.6 * s, width: 2 * s, height: 1.732 * s }} />
        ))}
        {pts.slice(1).map(([x, y], k) => {
          const [px, py] = pts[k];
          const ax = px * s + s, ay = py * s + 0.6 * s + 0.866 * s, bx = x * s + s, by = y * s + 0.6 * s + 0.866 * s;
          const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
          return <View key={`l${k}`} style={{ position: "absolute", left: (ax + bx) / 2 - len / 2, top: (ay + by) / 2 - 6, width: len, height: 12, borderRadius: 6, backgroundColor: "#E04585", borderWidth: 2.5, borderColor: "#fff", transform: [{ rotate: `${ang}rad` }] }} />;
        })}
        <Hover amp={4} sway={4} period={1300} style={{ position: "absolute", right: -8, top: -18 }}>
          <BeeSprite id="klevera" size={64} seed={1} />
        </Hover>
      </View>
    );
  }
  if (i === 2) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Image source={ART.comb} style={{ width: 80, height: 69 }} />
        <Bobbing amp={5}><Image source={ART.honey} style={{ width: 96, height: 96 }} /></Bobbing>
        <Image source={ART.comb} style={{ width: 80, height: 69 }} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Image source={ART.star} style={{ width: 64, height: 64 }} />
      <Bobbing amp={5}><Image source={ART.jelly} style={{ width: 90, height: 90 }} /></Bobbing>
      <Image source={ART.flame} style={{ width: 60, height: 60 }} />
    </View>
  );
}

export function Tutorial({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [i, setI] = useState(0);
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (visible) setI(0); }, [visible]);
  const go = (n: number) => {
    Animated.timing(a, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setI(n);
      Animated.spring(a, { toValue: 1, useNativeDriver: true, bounciness: 8 }).start();
    });
  };
  const last = i === SLIDES.length - 1;
  return (
    <Overlay visible={visible} dismissable={false}>
      <View accessibilityLabel="Обучение">
        <Animated.View style={{ alignItems: "center", opacity: a, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}><SlideArt i={i} /></View>
          <Txt v="h1" center style={{ marginTop: 6 }}>{SLIDES[i].title}</Txt>
          <Txt v="body" color={C.dim} center style={{ marginTop: 8, minHeight: 84 }}>{SLIDES[i].text}</Txt>
        </Animated.View>
        <View style={styles.dots}>
          {SLIDES.map((_, k) => <View key={k} style={[styles.dot, k === i && styles.dotOn]} />)}
        </View>
        <GameButton title={last ? "Поехали!" : "Дальше"} color={last ? "green" : "honey"} onPress={() => (last ? onDone() : go(i + 1))} />
        {!last ? (
          <Press onPress={onDone} style={{ alignSelf: "center", marginTop: 12, padding: 6 }} accessibilityRole="button">
            <Txt v="small" color={C.dim}>Пропустить</Txt>
          </Press>
        ) : <View style={{ height: 40 }} />}
      </View>
    </Overlay>
  );
}

// ---------- login reward ----------
export function LoginModal({ visible, index, reward, streak, onClaim, onClose }: {
  visible: boolean; index: number; reward: Reward; streak: number; onClaim: (from: Pt | null) => void; onClose: () => void;
}) {
  const ref = useRef<View>(null);
  const big = index === 6;
  return (
    <Overlay visible={visible} onClose={onClose}>
      <View style={{ alignItems: "center" }} accessibilityLabel="Награда за вход">
        <CloseBtn onPress={onClose} />
        <Txt v="tiny" color={C.dim}>НАГРАДА ЗА ВХОД · ДЕНЬ {index + 1} ИЗ 7</Txt>
        <View ref={ref} collapsable={false} style={{ marginVertical: 14 }}>
          <Bobbing amp={6}><Image source={big ? ART.chest : reward.honey ? ART.honey : ART.jelly} style={{ width: 120, height: 120 }} /></Bobbing>
        </View>
        <Txt v="h1" center>{big ? "Большой сундук!" : "С возвращением!"}</Txt>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 10, marginBottom: 6 }}>
          {reward.honey ? <View style={styles.rw}><Image source={ART.honey} style={{ width: 30, height: 30 }} /><Txt v="h2" color={C.honeyDark}>+{fmt(reward.honey)}</Txt></View> : null}
          {reward.jelly ? <View style={styles.rw}><Image source={ART.jelly} style={{ width: 30, height: 30 }} /><Txt v="h2" color={C.jelly}>+{reward.jelly}</Txt></View> : null}
        </View>
        <Txt v="small" color={C.dim} center style={{ marginBottom: 16 }}>
          {streak > 0 ? `Вы заходите ${streak + 1}-й день подряд. ` : ""}Заходите каждый день — на 7-й день ждёт сундук.
        </Txt>
        <GameButton title="Забрать" color="green" style={{ alignSelf: "stretch" }} onPress={async () => onClaim(await centerOf(ref.current))} label="Забрать награду" />
      </View>
    </Overlay>
  );
}

// ---------- settings ----------
export function SettingsModal({ visible, notifications, gardenReminders, haptics, notifBlocked, onNotifications, onGardenReminders, onHaptics, onTutorial, onReset, onClose }: {
  visible: boolean; notifications: boolean; gardenReminders: boolean; haptics: boolean; notifBlocked: boolean;
  onNotifications: (v: boolean) => void; onGardenReminders: (v: boolean) => void; onHaptics: (v: boolean) => void; onTutorial: () => void; onReset: () => void; onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(0);
  useEffect(() => { if (!visible) setConfirm(0); }, [visible]);
  return (
    <Overlay visible={visible} onClose={onClose}>
      <View accessibilityLabel="Настройки">
        <CloseBtn onPress={onClose} />
        <Txt v="h1" style={{ marginBottom: 12 }}>Настройки</Txt>
        {NOTIFICATIONS_SUPPORTED ? (
          <>
            <Row title="Напоминания" sub="Улей полон · новая головоломка">
              <Toggle value={notifications} onChange={onNotifications} label="Напоминания" />
            </Row>
            <Row title="Сад" sub={notifications ? "Цветы распустились · грядки высохли" : "Работает, когда включены напоминания"}>
              <Toggle value={notifications && gardenReminders} onChange={(v) => { onGardenReminders(v); if (v && !notifications) onNotifications(true); }} label="Напоминания о саде" />
            </Row>
          </>
        ) : (
          <Row title="Напоминания" sub="Улей полон · головоломка дня · сад">
            <View style={{ backgroundColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}><Txt v="small" color={C.dim}>скоро</Txt></View>
          </Row>
        )}
        {notifBlocked ? (
          <Press onPress={() => Linking.openSettings().catch(() => {})} style={{ marginBottom: 8 }}>
            <Txt v="small" color={C.red}>Уведомления запрещены в Android. Открыть настройки →</Txt>
          </Press>
        ) : null}
        <Row title="Вибрация" sub="Отклик при касании сот">
          <Toggle value={haptics} onChange={onHaptics} label="Вибрация" />
        </Row>
        <View style={{ gap: 10, marginTop: 14 }}>
          <GameButton small title="Показать обучение" color="white" onPress={onTutorial} />
          <GameButton small title={confirm === 0 ? "Сбросить прогресс" : confirm === 1 ? "Точно? Нажмите ещё раз" : "Сброс…"} color={confirm ? "honey" : "white"}
            onPress={() => { if (confirm === 0) setConfirm(1); else { setConfirm(2); onReset(); } }} />
        </View>
        <Txt v="tiny" color={C.faint} center style={{ marginTop: 14 }}>
          {inTelegram() ? "Buzzle 1.2.0 · прогресс сохраняется в Telegram" : "Buzzle 1.2.0 · данные хранятся только на устройстве"}
        </Txt>
      </View>
    </Overlay>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="small" color={C.dim}>{sub}</Txt>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EBD6B0" },
  dotOn: { width: 24, backgroundColor: C.honeyDeep },
  rw: { flexDirection: "row", alignItems: "center", gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
});
