import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { GameState, boosts, dailyStreak, dayColorInfo, freeMoves, puzzleHoneyMult, today } from "../logic/game";
import { FLOWERS } from "../logic/garden";
import { DAILY_MOVES, DAILY_STARS } from "../logic/day";
import { COLOR_NAMES } from "../logic/bees";
import { ART } from "../ui/art";
import { C, shadow } from "../ui/theme";
import { Bobbing, Card, fmt, GameButton, Stars, Txt } from "../ui/components";
import { dateLong, days, weekday } from "../ui/format";

interface Props { s: GameState; now: number; onPlay: (mode: "daily" | "free") => void }

function HexCluster() {
  const pos = [[0, 0, 2], [1, -0.5, 0], [1, 0.5, 1], [-1, -0.5, 3], [-1, 0.5, 0], [0, -1, 4], [0, 1, 2]];
  const s = 17, cx = 2.5 * s, cy = 2.6 * s;
  return (
    <View style={{ width: 5 * s, height: 5.2 * s }}>
      {pos.map(([q, r, c], i) => (
        <Image key={i} source={ART.cells[c]} style={{ position: "absolute", width: 2 * s * 0.96, height: 1.732 * s * 0.96, left: cx + q * 1.5 * s - 0.96 * s, top: cy + r * 1.732 * s - 0.83 * s }} />
      ))}
    </View>
  );
}

export default function PuzzleScreen({ s, now, onPlay }: Props) {
  const d = today(s, now);
  const res = s.daily.results[d];
  const streak = dailyStreak(s, now);
  const b = boosts(s);
  const date = new Date(now);
  const chips: string[] = [];
  if (freeMoves(s) > 20) chips.push(`+${freeMoves(s) - 20} ход.`);
  b.colorMult.forEach((m, i) => { if (m > 1) chips.push(`${COLOR_NAMES[i]} ×${String(Math.round(m * 100) / 100).replace(".", ",")}`); });
  const dc = dayColorInfo(s, now);
  if (b.wildChance > 0) chips.push("больше джокеров");
  if (b.bombAt < 6) chips.push(`бомба из ${b.bombAt}`);
  const honeyBonus = Math.round((puzzleHoneyMult(s) - 1) * 100);
  if (honeyBonus > 0) chips.push(`мёд +${honeyBonus}%`);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.daily, shadow]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color="#8A5200">ЕЖЕДНЕВНАЯ ГОЛОВОЛОМКА</Txt>
            <Txt v="h1" color="#4A2C12" style={{ marginTop: 2 }}>{dateLong(date)}</Txt>
            <Txt v="small" color="#8A5200">{weekday(date)} · {DAILY_MOVES} ходов · одна на всех</Txt>
          </View>
          <Bobbing amp={4}><HexCluster /></Bobbing>
        </View>
        <View style={styles.dailyRow}>
          <Stars n={res?.stars ?? 0} size={34} gap={4} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {res ? <Txt v="small" color="#8A5200">лучший счёт</Txt> : null}
            {res ? <Txt v="num" color="#4A2C12">{fmt(res.score)}</Txt> : <Txt v="small" color="#8A5200">ещё не сыграна</Txt>}
          </View>
        </View>
        <View style={styles.thresholds}>
          {DAILY_STARS.map((t, i) => (
            <View key={i} style={styles.th}>
              <Image source={ART.star} style={{ width: 16, height: 16 }} />
              <Txt v="small" color="#6B3E00">{fmt(t)}</Txt>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 12 }}>
          <Image source={ART.flame} style={{ width: 22, height: 22, opacity: streak ? 1 : 0.4 }} />
          <Txt v="small" color="#6B3E00">
            {streak ? `Серия: ${days(streak)} подряд` : "Пройдите сегодня, чтобы начать серию"}
            {s.daily.best > 1 ? ` · рекорд ${s.daily.best}` : ""}
          </Txt>
        </View>
        <GameButton
          title={res?.stars === 3 ? "Переиграть" : res ? "Ещё попытка" : "Играть"}
          sub={res ? "засчитывается лучший результат" : "звёзды = маточное молочко"}
          color={res?.stars === 3 ? "white" : "green"}
          onPress={() => onPlay("daily")}
          label="Играть ежедневную головоломку"
        />
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 2, borderColor: dc.active ? C.pollen[dc.color] : C.line }}>
        <Image source={ART.cells[dc.color]} style={{ width: 46, height: 40, opacity: dc.active ? 1 : 0.55 }} />
        <View style={{ flex: 1 }} accessibilityLabel="Цвет дня">
          <Txt v="h3">Цвет дня: {COLOR_NAMES[dc.color]} ×1,5</Txt>
          <Txt v="small" color={dc.active ? C.greenDark : C.dim}>
            {dc.active
              ? "Включён садом: в свободной игре эти соты дают ×1,5 очков, в головоломке дня — +50% мёда за них."
              : `Посади в саду «${FLOWERS.find((f) => f.color === dc.color)!.name}», чтобы включить бонус.`}
          </Txt>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.freeIcon}><Image source={ART.honey} style={{ width: 42, height: 42 }} /></View>
          <View style={{ flex: 1 }}>
            <Txt v="h2">Свободная игра</Txt>
            <Txt v="small" color={C.dim}>{freeMoves(s)} ходов · без ограничений · мёд в улей</Txt>
          </View>
        </View>
        {chips.length ? (
          <View style={styles.chips}>
            {chips.map((c) => <View key={c} style={styles.chip}><Txt v="tiny" color="#7B52C2">{c}</Txt></View>)}
          </View>
        ) : <Txt v="small" color={C.dim} style={{ marginTop: 10 }}>Открывайте пчёл — они дают бонусы в свободной игре.</Txt>}
        {s.stats.bestScore > 0 ? <Txt v="small" color={C.dim} style={{ marginTop: 8 }}>Рекорд: {fmt(s.stats.bestScore)} очков</Txt> : null}
        <GameButton title="Играть" color="honey" style={{ marginTop: 12 }} onPress={() => onPlay("free")} label="Свободная игра" />
      </Card>

      <Card>
        <Txt v="h3" style={{ marginBottom: 10 }}>Как играть</Txt>
        <Rule img={ART.cells[1]} title="Цепочки" text="Ведите пальцем по соседним сотам одного цвета — от 3 штук. Длиннее цепочка — больше очков." />
        <Rule img={ART.cells[0]} overlay={ART.bomb} title="Бомба маточного молочка" text="Цепочка из 6+ сот оставляет бомбу. Включите её в цепочку — она взорвёт соседей." />
        <Rule img={ART.wild} title="Радужный джокер" text="Подходит к любому цвету." />
        <Rule img={ART.flame} title="Комбо" text="Цепочки из 5+ сот подряд увеличивают множитель очков." />
      </Card>
    </ScrollView>
  );
}

function Rule({ img, overlay, title, text }: { img: number; overlay?: number; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "center" }}>
      <View style={{ width: 44, height: 38 }}>
        <Image source={img} style={{ width: 44, height: 38 }} resizeMode="contain" />
        {overlay ? <Image source={overlay} style={{ position: "absolute", width: 44, height: 38 }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="h3" style={{ fontSize: 15 }}>{title}</Txt>
        <Txt v="small" color={C.dim}>{text}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  daily: { backgroundColor: "#FFC94A", borderRadius: 28, padding: 18, borderWidth: 3, borderColor: "#FFB51F" },
  dailyRow: { flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 18, padding: 10 },
  thresholds: { flexDirection: "row", gap: 8, marginTop: 10 },
  th: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  freeIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFF3D6", alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { backgroundColor: "#F1E8FF", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
});
