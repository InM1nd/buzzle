/**
 * Configure @Buzzle_game_bot via the Bot API (no messages are sent to anyone):
 * menu button «Играть» -> the Mini App, Russian description / short description, /start command.
 *   TELEGRAM_BOT_TOKEN=... node scripts/telegram/setup-bot.mjs [https://inm1nd.github.io/buzzle/]
 * The token is read from the environment and never printed.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN is not set"); process.exit(1); }
const URL = process.argv[2] || "https://inm1nd.github.io/buzzle/";
const mask = (s) => String(s).split(TOKEN).join("***");

async function api(method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${mask(j.description)}`);
  return j.result;
}

const DESCRIPTION = [
  "🐝 Buzzle — уютный улей и медовая головоломка.",
  "",
  "Стройте соты и собирайте мёд — пчёлы работают, даже когда вас нет. Решайте головоломку дня из шестиугольных сот, " +
    "сажайте сад у улья и растите 12 пород пчёл до 10 уровня.",
  "",
  "Нажмите «Играть», чтобы начать. Прогресс сохраняется в Telegram.",
].join("\n");
const SHORT = "Уютный улей и медовая головоломка: соты, мёд, сад и 12 пород пчёл 🐝";

const me = await api("getMe");
console.log(`bot: @${me.username}`);
await api("setChatMenuButton", { menu_button: { type: "web_app", text: "Играть", web_app: { url: URL } } });
for (const language_code of [undefined, "ru"]) {
  await api("setMyDescription", { description: DESCRIPTION, ...(language_code ? { language_code } : {}) });
  await api("setMyShortDescription", { short_description: SHORT, ...(language_code ? { language_code } : {}) });
}
await api("setMyCommands", { commands: [{ command: "start", description: "Играть в Buzzle" }] });

// verify
console.log("menu button:", JSON.stringify(await api("getChatMenuButton")));
console.log("description:", JSON.stringify((await api("getMyDescription")).description));
console.log("short description:", JSON.stringify((await api("getMyShortDescription")).short_description));
console.log("commands:", JSON.stringify(await api("getMyCommands")));
