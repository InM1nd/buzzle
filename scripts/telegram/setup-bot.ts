/**
 * Configure @Buzzle_game_bot via the Bot API (no messages are sent to anyone): menu button → the Mini App,
 * description / short description / commands per language (default = English, plus en/uk/ru) from the game's i18n.
 *   TELEGRAM_BOT_TOKEN=... npx tsx scripts/telegram/setup-bot.ts [https://inm1nd.github.io/buzzle/]
 * The token is read from the environment and never printed.
 */
import { LANGS, render, STRINGS } from "../../src/i18n";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN is not set"); process.exit(1); }
const URL = process.argv[2] || "https://inm1nd.github.io/buzzle/";
const mask = (s: unknown) => String(s).split(TOKEN!).join("***");

async function api(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = (await r.json()) as { ok: boolean; result: any; description?: string };
  if (!j.ok) throw new Error(`${method}: ${mask(j.description)}`);
  return j.result;
}

(async () => {
  const me = await api("getMe");
  console.log(`bot: @${me.username}`);
  // the menu button text is per chat, not per language: one short word for everyone
  await api("setChatMenuButton", { menu_button: { type: "web_app", text: render(STRINGS["bot.button"], "en"), web_app: { url: URL } } });
  for (const lang of [undefined, ...LANGS]) {
    const l = lang ?? "en";
    const description = render(STRINGS["bot.desc"], l), short_description = render(STRINGS["bot.short"], l);
    if (description.length > 512 || short_description.length > 120) throw new Error(`${l}: description too long`);
    const lc = lang ? { language_code: lang } : {};
    await api("setMyDescription", { description, ...lc });
    await api("setMyShortDescription", { short_description, ...lc });
    await api("setMyCommands", { commands: [{ command: "start", description: render(STRINGS["bot.button"], l) + " · Buzzle" }], ...lc });
  }
  // verify
  console.log("menu button:", JSON.stringify(await api("getChatMenuButton")));
  for (const lang of [undefined, ...LANGS]) {
    const lc = lang ? { language_code: lang } : {};
    console.log(`[${lang ?? "default"}] short:`, JSON.stringify((await api("getMyShortDescription", lc)).short_description));
    console.log(`[${lang ?? "default"}] description starts:`, JSON.stringify(String((await api("getMyDescription", lc)).description).slice(0, 60)));
  }
})().catch((e) => { console.error(mask(e instanceof Error ? e.message : e)); process.exit(1); });
