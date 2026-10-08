import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import App from "../App";
import { GameState, newState, today } from "../src/logic/game";

const KEY = "bzz:state:v1";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

async function stored(): Promise<GameState> {
  return JSON.parse((await AsyncStorage.getItem(KEY))!);
}
async function seed(patch: (s: GameState) => GameState) {
  const now = Date.now();
  let s = newState(now);
  s = { ...s, settings: { ...s.settings, tutorialDone: true }, login: { lastDay: today(s, now), index: 0, streak: 1 } };
  await AsyncStorage.setItem(KEY, JSON.stringify(patch(s)));
}
async function boot() {
  await render(<App />);
  expect(await screen.findByLabelText("Настройки")).toBeTruthy();
}

test("first run: tutorial → login reward → honey persisted", async () => {
  await boot();
  expect(await screen.findByText("Привет, я Жужа!")).toBeTruthy();
  await fireEvent.press(screen.getByText("Дальше"));
  expect(await screen.findByText("Собирайте пыльцу")).toBeTruthy();
  await fireEvent.press(screen.getByText("Пропустить"));
  expect(await screen.findByText("С возвращением!")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Забрать награду"));
  await waitFor(async () => {
    const s = await stored();
    expect(s.settings.tutorialDone).toBe(true);
    expect(s.honey).toBe(150);
    expect(s.login.lastDay).not.toBeNull();
  });
});

test("hive: build a comb next to the centre, then upgrade it", async () => {
  await seed((s) => ({ ...s, honey: 1000 }));
  await boot();
  expect(screen.getByText("Улучшения")).toBeTruthy();
  // slot index 2 is adjacent to the centre (ring 1)
  await fireEvent.press(screen.getByLabelText("Пустая ячейка 3"));
  await fireEvent.press(await screen.findByLabelText("Построить соту"));
  await waitFor(async () => expect((await stored()).hive.combs[2]).toBe(1));
  await fireEvent.press(screen.getByLabelText("Улучшить соту"));
  await waitFor(async () => {
    const s = await stored();
    expect(s.hive.combs[2]).toBe(2);
    expect(s.honey).toBeLessThan(1000);
    expect(s.tasks.day).toBeGreaterThan(0);
  });
  await fireEvent.press(screen.getByLabelText("Купить: Рабочие пчёлы"));
  await waitFor(async () => expect((await stored()).upgrades.workers).toBe(1));
});

test("hive: offline production is capped and collected", async () => {
  await seed((s) => ({ ...s, hive: { ...s.hive, lastTick: Date.now() - 48 * 3600_000 } }));
  await boot();
  // 2 level-1 combs = 16/h × 1.05 (Жужа) → cap 6 h ≈ 101
  expect(await screen.findByText("Улей полон!")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Собрать мёд"));
  await waitFor(async () => {
    const s = await stored();
    expect(s.honey).toBe(50 + 101);
    expect(s.stats.collects).toBe(1);
  });
});

test("puzzle hub → daily round → finish early → result → stats saved", async () => {
  await seed((s) => s);
  await boot();
  await fireEvent.press(screen.getByLabelText("Головоломка"));
  expect(await screen.findByText("ЕЖЕДНЕВНАЯ ГОЛОВОЛОМКА")).toBeTruthy();
  expect(screen.getByText("Свободная игра")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Играть ежедневную головоломку"));
  expect(await screen.findByLabelText("Игровое поле")).toBeTruthy();
  expect(screen.getByLabelText("Осталось ходов: 20")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Выйти из раунда"));
  await fireEvent.press(await screen.findByText("Закончить"));
  expect(await screen.findByLabelText("Итоги раунда")).toBeTruthy();
  expect(screen.getByText("Почти получилось!")).toBeTruthy();
  await fireEvent.press(screen.getByText("Готово"));
  expect(await screen.findByLabelText("Настройки")).toBeTruthy();
  await waitFor(async () => expect((await stored()).stats.rounds).toBe(1));
});

test("free play shows bee bonuses and starts a round", async () => {
  await seed((s) => ({ ...s, bees: ["zhuzha", "boris", "solnyshko"] }));
  await boot();
  await fireEvent.press(screen.getByLabelText("Головоломка"));
  expect(await screen.findByText("+1 ход.")).toBeTruthy();
  expect(screen.getByText("жёлтые ×2")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Свободная игра"));
  expect(await screen.findByLabelText("Осталось ходов: 21")).toBeTruthy();
});

test("bees: unlock a species with royal jelly", async () => {
  await seed((s) => ({ ...s, jelly: 5 }));
  await boot();
  await fireEvent.press(screen.getByLabelText("Пчёлы"));
  expect(await screen.findByText("Коллекция пчёл")).toBeTruthy();
  expect(screen.getByText("Открыто 1 из 12. Каждая пчела даёт постоянный бонус.")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Пушинка, закрыта"));
  await fireEvent.press(await screen.findByLabelText("Открыть пчелу за 4 молочка"));
  await waitFor(async () => {
    const s = await stored();
    expect(s.bees).toContain("pushinka");
    expect(s.jelly).toBe(1);
  });
  expect(await screen.findByText("Добро пожаловать в улей!")).toBeTruthy();
});

test("tasks: three daily tasks, claim a finished one, enable reminders", async () => {
  await seed((s) => s);
  await boot();
  await fireEvent.press(screen.getByLabelText("Задания"));
  expect(await screen.findByText("Задания дня")).toBeTruthy();
  expect(screen.getByText("Сундук дня")).toBeTruthy();
  expect(screen.getByText("Завтра будет новая")).toBeTruthy();
  await fireEvent.press(screen.getAllByLabelText("Напоминания")[0]);
  await waitFor(async () => expect((await stored()).settings.notifications).toBe(true));
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
});

test("tasks: completed task can be claimed for honey + jelly", async () => {
  const now = Date.now();
  const { tasksForDay } = require("../src/logic/tasks");
  await seed((s) => {
    const t = tasksForDay(s.tasks.day)[0];
    return { ...s, tasks: { ...s.tasks, progress: { [t.id]: t.target } } };
  });
  await boot();
  await fireEvent.press(screen.getByLabelText("Задания"));
  const btn = await screen.findAllByText("Забрать");
  await fireEvent.press(btn[0]);
  await waitFor(async () => {
    const s = await stored();
    expect(s.tasks.claimed).toHaveLength(1);
    expect(s.jelly).toBe(1);
    expect(s.honey).toBe(90);
  });
  expect(now).toBeGreaterThan(0);
});

test("settings: toggle haptics and reset progress", async () => {
  await seed((s) => ({ ...s, honey: 999 }));
  await boot();
  await fireEvent.press(screen.getByLabelText("Настройки"));
  expect(await screen.findByText("Вибрация")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Вибрация"));
  await waitFor(async () => expect((await stored()).settings.haptics).toBe(false));
  await fireEvent.press(screen.getByText("Сбросить прогресс"));
  await fireEvent.press(screen.getByText("Точно? Нажмите ещё раз"));
  await waitFor(async () => {
    const s = await stored();
    expect(s.honey).toBe(50);
    expect(s.settings.tutorialDone).toBe(false);
  });
});
