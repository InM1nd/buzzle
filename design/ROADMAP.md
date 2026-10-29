# Buzzle — roadmap

*Status: stable release v1.6.0 "Pumpkin Night" (October 2026). Android app and Telegram Mini App (@Buzzle_game_bot); in Telegram the progress is stored in Telegram's cloud.*

The Russian version of this document is [`ROADMAP.ru.md`](ROADMAP.ru.md); both files are kept in sync.

## 1. Core loop: why a player comes back every day

| Hook | How it works now | Weak spot |
|---|---|---|
| The hive fills up | 6–12 h of storage, a "hive is full" notification | After about 2 weeks comb growth hits exponential prices and collecting turns into a chore |
| Daily puzzle | One seed for everyone, 20 moves, 1–3 stars, day streak | It is the only "event" of the day and takes 3–4 minutes |
| Tasks and login | 3 tasks + a chest, a 7-day calendar | Tasks are repetitive, the week repeats without change |
| Bee collection | 12 species for royal jelly | Jelly comes at about 8–10 a day (login ≈1.7, tasks and chest 5, stars up to 3), and all bees cost 102. **The collection runs out in about 2 weeks**, and jelly then has no use |

**Conclusion.** The short loop "open, collect, play one puzzle" works. There is no medium (week) or long (month and beyond) loop. Priorities: give jelly and honey long-term sinks, add a weekly goal and make the day more varied (a second short activity besides the puzzle).

## 2. New mini-games (all feed the same economy)

| Mini-game | Mechanic in one line | What it gives |
|---|---|---|
| **Nectar flight** | A 60 s runner: the bee flies over a meadow, swipes up and down to collect flowers and dodges wasps and raindrops | Nectar (the new resource for bee evolution) and a little honey |
| **Flower garden** | Plant seeds in the beds next to the hive, water them every few hours; different flowers raise different hive bonuses | A passive production bonus and the "colour of the day" ×1.5 for the puzzle |
| **Pollen sorting** (liked, concept drawn) | Bees carry pollen of different colours; the player drags each into the jar of the matching colour before the store overflows, with combos (the earlier idea: a ball-sort on honeycombs). Frames: `design/concepts/minigames/` | Jelly for the weekly set, progress stars |
| **Hive defence** (liked, concept drawn) | Tower-defence-lite: wasps and a hornet leader walk a trail to the hive; the player places guard bees, sticky drops and trap barrels for honey, 3–5 waves. Frames: `design/concepts/minigames/` | Protects part of the stock (a bonus storage for the day), trophies for the collection |

It is best to start with the **garden** (cheap, idle-friendly, gives a reason to come back during the day) and the **nectar flight** (shows the new bees in motion).

## 3. Meta progression

- **Hive levels and biomes** (later / idea, not in v1.7; see "Open questions" in section 7). Meadow → Apple orchard → Lavender field → Mountain heather → Winter hive. A new biome opens with the hive level. It brings a new background, its own comb palette in the puzzle, new bee species and a production multiplier. "Moving" (a soft prestige) resets the comb levels but keeps the bees and gives a permanent bonus.
- **Bee levels and evolution.** Every bee has levels 1–10 bought with nectar, the bonus grows (+5% → +15%). At levels 5 and 10 the look changes: a cap, a crown, shiny wings. This is the main long-term sink for jelly and nectar.
- **Collections.** A flower album (from the garden), hornet trophies, hive decorations. A complete album page gives a permanent bonus.
- **Seasons and events.** A themed season every 4 weeks ("Autumn Harvest", "New Year Hive") with its own task storyline and an exclusive bee. Fully offline, the calendar is built into the app.
- **Quests and story.** A short story of Zhuzha in chapters, one per biome: 5–8 tasks with character lines and illustrations in the game's style.
- **Achievements.** 30–40 of them ("100 bombs", "30-day streak", "hive level 10"). Each gives jelly or an avatar frame.

## 3a. Loot boxes: surprise combs

Only for in-game resources, no purchases for money, the drop odds are visible in the game.

| Chest | How to get it | What is inside |
|---|---|---|
| **Wooden comb** | Free once a day, for 3 tasks | Honey, nectar, seeds, 1 random item |
| **Wax comb** | For 3 stars in the daily puzzle, the weekly chest | More resources, a chance of rare seeds and decorations |
| **Golden comb** | For a 7-day streak, end of a season, a rare drop | A guaranteed rare item, a chance of an epic one |
| **Royal comb** | Seasons only, for finishing the season storyline | An exclusive seasonal item |

**What can drop:**
- Resources: honey, nectar, royal jelly.
- Seeds, including rare flowers that are not in the regular shop (moon poppy, golden sunflower).
- Hive and garden decorations: lanterns, mushrooms, benches, bunting. Purely visual, a collection.
- Bee outfits: scarf, glasses, bag, seasonal costumes. They can be worn by any bee.
- Puzzle boosters: +3 moves, a bomb at the start, shuffle.
- Bee fragments: 10 fragments give a rare bee outside the main dozen (for example the "Night bee").

**Rarity:** common, rare, epic, legendary. Frame colours match the pollen colours.

**Fairness:**
- Pity: an epic item within 10 golden combs at the latest, a legendary within 30.
- Duplicates turn into "collection pollen", which buys a specific item in the shop.
- The collection album shows how much is collected, and a complete page gives a permanent bonus.

**Feel:** a chest opens with taps (the wax cracks in 3 stages), bees fly in to look, a rare item bursts out with a flash and a vibration. An "Open all" button is possible.

**Balance:** one or two free chests a day; run the simulation so that the outfit and decoration collection lasts 2–3 months.

## 4. Economy: sources and sinks

| Resource | Sources | Sinks now | New sinks |
|---|---|---|---|
| Honey | Hive, puzzle, tasks, chests | Combs (up to level 40 since v1.5), 4 upgrades (up to levels 30 / 12 / 30 / 10) | Garden, workshop, moving to a biome, decorations |
| Jelly | Daily stars, tasks, login, chests | Only buying bees (102 in total) | Bee evolution, a seasonal bee, a spare move in the daily puzzle (at most 1 a day) |
| Nectar | Garden, flight, chests | — | Bee levels |

Balance notes:
- Keep the ratio of **~70% honey from the hive and ~30% from active play**. Right now the meadow and Zorka bonuses push it towards the puzzle, which is fine while the hive remains a reason to come back.
- Comb prices (×1.5 per level) and production (×1.1 per level) diverge: at level 15+ the payback exceeds 10 days. We need either a moving prestige or a softer curve after level 12.
- Jelly is the "premium" currency without real-money purchases. Do not make sinks that look like a paywall. Guideline: evolving one bee ≈ 3–5 days of income.
- Before every version run the bot simulation (`scripts/calibrate.ts`) and extend it to 30/60/90 days.

## 5. Retention

- **Daily:** the daily puzzle, the hive, the garden (watering), 3 tasks. Add the "colour of the day" with ×1.5 and a first-win bonus.
- **Weekly:** a weekly chest for 15 completed tasks, a weekly pollen-sorting set, the "weekend puzzle" (30 moves, its own reward).
- **Events:** 4-week seasons, holidays (visuals plus one bee).
- **Soft mechanics:** a streak freeze once a week (for jelly), notifications only when useful (hive full, garden harvest, new season), with a frequency limit.

## 6. What is really offline and what needs a server

| Offline (as now) | Needs a backend |
|---|---|
| All mini-games, biomes, evolution, seasons (the calendar is built in), achievements, story | A daily-puzzle leaderboard (everyone has one seed, so a fair ranking is possible) |
| A "ranking" against bots and your own past results | Friends, gifts, guest visits to a hive |
| Save export and import as a file or QR code | Cloud save and moving between phones (or Google Play Games Saved Games) |
| | Cheat protection (server-side move checks), live events without an app update |

A minimal backend, if needed: one serverless function with a database (for example Cloudflare Workers + D1) for the daily records with a move-sequence check. That is 2–3 days of work plus a privacy policy.

## 7. Version plan

| Version | Content | Status |
|---|---|---|
| **v1.2** | Low-poly bees, garden, nectar, bee levels 1–10 | ✅ done |
| **Telegram** | Mini App on GitHub Pages, Telegram cloud save, the "Play" button, direct link t.me/Buzzle_game_bot/Buzzle | ✅ done |
| **v1.2.1** | Bee renaming, fix for disappearing navigation icons in Telegram, bee levels in puzzle bonuses | ✅ done |
| **v1.3** | Surprise combs, album and pollen shop, outfits, decorations, rare seeds, boosters, the Night bee, weekly chest, weekend puzzle, streak freeze, save export/import, "Invite a friend" | ✅ done |
| **v1.4 — QoL: languages, updates, settings** | English, Ukrainian, Russian, updates from settings, expanded settings, privacy policy, a silent "early player" mark in the save (v1.4.0) | ✅ done |
| **v1.4.1** | The Surprises and Garden grids adapt to the container width (a Telegram fix) | ✅ done |
| **v1.4.2** | Small fixes (see "Fix plan" below); the changes went into the v1.5 branch, there may be no separate release | ⏩ folded into v1.5 |
| **v1.5 — UX/UI optimisation** | Five equal tabs, the new "honey crystal" art, new bees with flapping wings, reworked hive, garden, puzzle and tasks (see below) | ✅ done (v1.5.0) |
| **v1.5.1** | Minor fix release after 1.5.0: a single floating currency bar, compact garden timers, a planting dialog, a clearer bee level, softer puzzle tiles (see "v1.5.1 — fix plan" below) | ⏩ folded into v1.6 (v1.6.0) |
| **v1.6** | A new mini-game (nectar flight) + a Halloween event (pumpkin combs, bee costumes, event tasks) + decorations: decide what they are for (was v1.5.5) | ✅ released (v1.6.0, 19 October 2026): Pumpkin Night event, Night Flight, costumes, guest, seasonal backdrops; the purpose of decorations moves to a later version |
| **v1.6.1** | Fixes and polish after 1.6.0: guest banner, booster and reward cards, safe areas and status bar, perf (clock pause), intro clip robustness, texts (informal address in ru) | ✅ released Oct 28, 2026 |
| **v1.6.2** | Smoothness and analytics: iOS/Telegram WebView performance (PR #14), Telegram layout fixes (PR #15), web smoothness in the puzzle and hive (PR #16), anonymous retention analytics on PostHog EU with an opt-out in settings (issue #3, PR #12) | in testing (branch `release-1.6.2`) |
| **v1.7** | Winter season (a seasonal bee, a royal comb) + TBD (see "Open questions" below). Target: release before early December 2026 | open |
| **v1.8** | New permanent Play-tab mode **Hive Run** (a Wild Hive-style roguelite, minimal version; hive defence from wasp raids comes later as part of it). See "v1.8 — Hive Run" below | planned |
| **v1.9** | Improvements and fixes from feedback; a Christmas / New Year event (content TBD, see "Open questions") | open |
| **v2.0** | Event analytics and an economy dashboard; online: sign-in and shared Telegram/Android progress, a leaderboard, friends, gifts; more games; a spring season, then seasons in a loop; perks for beta testers and the start of the public test (posts on Threads); Hive Run expansion: 8–12-year runs, honey market, wasps and queen defence, run leaderboard |

### v1.4 — QoL: languages, updates, settings

**Languages**
- English (default), Ukrainian, Russian.
- A language picker on first launch; the default language is English. It can be changed later in settings.
- In Telegram the default language can be suggested from the account language, but the choice stays with the player.
- Good localisation rather than a literal translation: lively names of bees, flowers, combs and decorations in every language, correct plural forms (1 бджола / 2 бджоли / 5 бджіл), a natural tone of hints and notifications.
- The whole game goes through translation keys (i18n), including notifications, the Telegram bot description and the "Invite a friend" texts.

**In-app update through settings (Android)**
- A "Check for updates" button: the app looks at the latest GitHub release and shows the version and "what's new".
- "Download and install": the APK is downloaded inside the app and the system installer opens (Android asks once for permission to install from this source). The progress is kept, the signature is the same.
- An unobtrusive auto-check once a day and a badge on the gear if there is a new version.
- In Telegram the update arrives by itself; after an update "What's new" is shown.

**Expanded settings**
- Language.
- Sound and vibration separately (when sounds appear).
- Notifications by type: hive, daily puzzle, garden, chests; quiet hours.
- Updates and "what's new".
- Saving: export, import, (later) an account.
- About: version, GitHub link, credits, privacy policy.
- Replay the tutorial and reset progress with a double confirmation.

### v1.5 — UX/UI optimisation

Status: **released as 1.5.0** (versionCode 21, October 2026) from the `v1.5-ui` branch merged into `main`.

**Delivered in 1.5.0 (from Alexander's feedback):**
- Five equal tabs: Hive (a Combs/Garden switch), Play, Bees (All/Outfits), Surprises (Chests/Shop/Album), Tasks. All currencies and the gear in the top bar, a floating bottom tab bar.
- Hive: one sign (level and honey per hour), one honey meter with a **Collect** button and the time until full, upgrades right on the screen, decorations standing in the scene. Garden: three beds per row, plants growing inside the bed.
- Tasks: progress bars, the weekly chest, the 7-day login calendar, streak freeze, statistics. The weekend puzzle moved to Play, "Invite a friend" to settings. Settings are a separate page.
- New "honey crystal" art: hive and garden backgrounds, combs, tiles, items, chests, decorations. 13 bees from 2D turnarounds with flapping wings; outfits work on any bee (including in the hive).
- Puzzle: tight 1:1 tiles without a selection frame, a hint, the colour of the day and round stats under the board, a booster picker before free play.
- Progression: combs up to level 40, hive upgrades 30 / 12 / 30 / 10 (the price and bonus formulas did not change).
- A new app icon (Zhuzha with a crown).

**Not in 1.5.0 (carried over):**
- Sound effects (see "v1.5 — extras").
- Slim the APK: it is about 31 MB, the old bee renderer and `react-native-svg` are still in the build.
- A few old glyphs (album, shop, save, share) and the chest crack overlays still use the old art; the Telegram bot avatar and cover (`design/brand/telegram-v1/`) have to be set by hand in BotFather.
- Checking an install over 1.4.1 with real progress on a device and the UI inside the Telegram clients (so far only checked in a browser with a Telegram mock).

APK size: reasonably light, a guideline of up to 50–60 MB (the 24 MB limit is lifted). Sprites in WebP.

### v1.8 — Hive Run (Wild Hive-style roguelite mode)
A permanent mode in the Play tab, like Night Flight, separate from the cozy main loop. Mockups: `design/hive-run/`.

**Minimal version (v1.8):**
- A run of 3–4 "years" with 4 turns each; your own hive on hexes.
- One honey type.
- Sorties for nectar with a chance of losing bees.
- A yearly honey quota: miss it and the run ends.
- About 6 modifiers, pick 1 of 3 once a year.
- Reward: pollen for the main game, with a daily limit.
- The run is saved between sessions (one year ≈ 3–5 minutes). The architecture must let the run grow longer without a rewrite.

**Expansion (v2.0):** 8–12-year runs, a honey market with a floating price for 2–3 honey types, wasp raids and queen defence, a run leaderboard (needs accounts).

### Open questions (decisions of 21 October 2026, for a later brainstorm with Claude)

Neutral notes, nothing here is final yet.

- **v1.7 is rethought.** The meadow home screen and the biome chain (Meadow → Apple orchard → …) are **not** in v1.7. Both ideas stay below as "later / ideas".
- **Prestige ("moving")** should be optional, at the player's choice, possibly tied to biomes. When to add it is undecided.
- **Zhuzha's story, chapter 1** is being prepared separately, possibly for the public release. Not needed now.
- **Winter season: yes.** Agreed: a seasonal bee and a royal comb. Open: anything more, e.g. a seasonal mini-game or another seasonal activity?
- **Christmas / New Year event: yes**, content undecided. It should be interesting without overloading the player. Open: what exactly, and how it sits inside the winter season.
- Open: what else goes into v1.7 besides the winter season.

### Later / ideas: home screen as one meadow with objects

(Moved out of v1.7 on 21 October 2026; kept as an idea.)

Original reasoning: the meadow is needed once the world has more than one location (a second biome, an optional moving prestige).

- The home screen becomes **one solid meadow**, not a set of separate backgrounds or islands: common ground, common light and shadows, with objects standing on it. You tap an object and land in its location.
- Objects: a **cosy bee house** (opens "Bees"), a **tree or a stand with the hive** ("Hive"), **garden beds** ("Garden"), a **board with combs or a signpost** ("Play"), a **shop and chests** ("Surprises"), a **task board** ("Tasks"). The "house → Bees" link can be changed after testing.
- Objects are highlighted and labelled, with action badges: a task is ready, a chest can be opened, a harvest is ripe or the flowers need water, honey can be collected, the daily puzzle is available.
- A living meadow: bees (in their outfits) fly between the objects, collection decorations stand right on the meadow and give "the decoration spots" a purpose; light and weather may depend on the time of day and the season.
- Tapping: a highlight and a smooth zoom to the object of about 0.3–0.4 s, then the location screen with a "‹ Meadow" button. Inside the locations the familiar v1.5 screens stay (Combs/Garden, Chests/Shop/Album and so on).
- The tab bar stays as a fallback way to navigate: at the bottom or in a collapsible form. To be decided after testing: not everyone will realise that the objects are tappable.
- World growth: new biomes later become **additional meadows** you can swipe or switch between (the second biome, a winter meadow, Halloween), and closed meadows are shown as "soon" and set goals.
- Technically: one background layer and hotspot objects with coordinates as fractions of the screen (so it works at 360–430 px and in Telegram); badges come from the existing task, chest and garden data. Separate assets are needed: a house, a tree or hive stand, a task board, a puzzle board, a single meadow background.
- Concept mockups: `design/concepts/map-home/` (two compositions and a tap frame). It is a sketch made of existing assets and drawn placeholders, not the final design.

## 8. Launch and testing

**Stage 1 — a quiet test with friends (now → v2.0).** Only the Telegram Mini App (t.me/Buzzle_game_bot/Buzzle), no stores and no public posts. We collect feedback on balance, UX and bugs. Testers' progress is kept in Telegram's cloud, so it moves to accounts in v2.0 without loss.

**Stage 2 — the public test (from v2.0).** Posts on Threads once there are accounts and a leaderboard: new players compete at once and do not lose progress.
- Perks for early testers: an exclusive "Pathfinder" outfit / a "Beta tester" badge, a starter set of combs, a special frame in the leaderboard. They are identified by the Telegram accounts that played before v2.0 (an "early player" mark is already put in the save now).
- A referral reward for "Invite a friend".

**Stage 3 — stores (after the public test).** Google Play ($25, AAB, a closed test with 12 testers × 14 days, which can be recruited from stage 1–2 testers; in-app updates are disabled in the Play build). The App Store later ($99/year, an Expo build, TestFlight, a loot-box review).

The 24 MB limit only applied to chat attachments; the APKs are distributed through GitHub Releases, so we just keep the game reasonably light (a guideline of up to 50–60 MB).

## 9. Principles: the game should simply be pleasant

- One core, the hive and the puzzle; everything new feeds it.
- A daily budget of 5–10 minutes, at most 3 "mandatory" actions (honey, the daily puzzle, watering), the rest is optional.
- One main button per screen, secondary things in a menu.
- Gradual opening: the garden, chests and mini-games appear as you play.
- New mini-games live in one "Meadow" section, with no new tabs and no new currencies.
- Events are a wrapper (decoration, tasks), not new systems.
- For every addition, one simplification.
- Badges and notifications only when useful.
- The filter: "why will the player open this tomorrow?" No answer — the feature is not needed.

## 10. Analytics and economy

**What to track** (anonymously, no personal data; in Telegram by an ID hash; an opt-out in settings; mention it in the privacy policy):
- Retention D1/D7/D30, session length, sessions per day.
- Feature usage: how many players visit each mode and how often (daily puzzle, free play, garden, chests, shop, mini-games, events); where players drop out of the tutorial.
- Economy: sources and spending of honey, nectar, jelly and pollen by day; inflation and "stagnation" (a resource piles up with nothing to spend it on).
- Difficulty: stars in the daily puzzle, losses, booster use.
- Technical: errors and crashes, load time.

**Status:** retention events (first open, sessions, daily puzzle, streak, free play, event points) ship in v1.6.2 via PostHog EU (moved out of v1.7). Economy, feature-usage and technical events are still to do.

**How:** lightweight event collection (for example PostHog, or our own endpoint on Cloudflare Workers + D1 in v2.0, together with accounts); until v2.0 — local counters + manual tester feedback.

**Economy:**
- A source/sink table for every resource, kept in the repository and updated for each version.
- The bot simulator (`scripts/simulate.ts`) for 30/60/90 days before each release; targets: the collection lasts 2–3 months, no "dead" resources, the hive does not hit a ceiling.
- Balance decisions based on real data from v2.0, not only on simulation.

## 11. To think about
- More variety in the puzzle: different round layouts (one colour outweighing the rest, more jokers, clusters), later new board shapes and obstacles.

- Redo the bee and reward models (outfits, decorations) and their animations: more expressive poses, reaction animations (joy, sleep, work), possibly a new render style. Collect tester feedback first.
- Mini-game ideas after the brainstorm (short sessions, mobile-friendly; no versions assigned yet):
  - **Liked, candidates to keep:**
    - **Hive defence** (tower-defence-lite; concept drawn): guard bees, drops and traps along the trail, 3–5 waves of 2–3 minutes.
    - **Honey path** (concept drawn): rotate channel combs so honey reaches every jar, levels of 1–3 minutes.
    - **Pollen sorting** (concept drawn): drag bees with pollen into jars of the matching colour, 60–90 s.
    - **Comb builder** (merge): merge identical combs on a board up to the royal comb, about 3 minutes.
    - **Flappy-style bee**: one-tap flight between flower stems, 30–60 s sessions, seasonal wind and rain.
    - **Nectar-pouring puzzle** (water-sort style): pour nectar between jars until each is one colour; OK, may be merged with pollen sorting.
    - **Symbiosis with flowers**: the mini-game depends on which flowers grew in the player's garden, linking mini-games to the main game.
  - **Needs a mockup first:**
    - **Growing a hive maze**: build comb tunnels so the swarm delivers nectar by the best route, a mix of honey path and logistics. The user wants to see how it could look before deciding.
  - **No decision yet:** **Flower merge** (concept drawn): drop flowers into a crate, identical ones merge up to the golden sunflower.
  - **Rejected, do not re-propose:** Candle workshop, Scout dance, Bloom rhythm, Comb memory match, Nectar catcher, Scent hunt in fog, Slingshot bee (Angry Birds style), Cut-the-rope bee, Doodle-Jump bee, Bee swarm (snake.io style).

## Next steps

1. **v1.5:** ✅ released as 1.5.0 (sounds, the leftovers of old art and the APK size carry over).
2. **v1.5.1:** the minor fixes from Alexander's feedback (see "v1.5.1 — fix plan").
3. **v1.6:** the nectar flight, the Halloween event and the purpose of decorations (was v1.5.5), by October 31.
4. **v1.6.1:** ✅ released Oct 28, 2026 (fixes and polish).
5. **v1.7:** winter season (seasonal bee, royal comb) + TBD; biomes, the meadow home screen and prestige are later ideas, Zhuzha's story is prepared separately.

## v1.4.2 — fix plan (folded into v1.5)
- ✅ On narrow screens (360 px) the settings gear was clipped on the right of the top bar: in v1.5 all currencies and the gear fit, checked at 360 px.
- ✅ Bees in the hive flew without their chosen outfits: in v1.5 outfits are shown on the hive bees too.

## v1.5.1 — fix plan
- **One currency bar.** Merge all currencies into a single bar and remove the backdrop of the top area, the same way as the bottom tab bar: the pills and the gear float over the scene with no background strip.
- **Compact garden timers.** Redo the grow-time and the water timers as small compact components, so a bed shows its state at a glance without long status chips.
- **Planting in a dialog.** Planting opens a modal with the seeds, so the player does not have to scroll down the garden to pick a plant.
- **Clearer bee level.** The orange circles under the bees in the collection do not say what they mean. Show the level in an explicit way (for example a "Lv 5" label or a level badge with a progress bar) and keep it consistent with the bee card.
- **Softer puzzle tiles.** The tiles and glyphs are too contrasty and tiring for the eyes. Work out a calmer look: a softer colour palette, lower glyph contrast and less saturated outlines, while the five colours stay easy to tell apart (check with a colour-blindness simulation and on a dim screen).

## v1.5 — extras (not done, moved to the next versions)
- Sound effects (taps, honey collecting, the puzzle, surprises), light in size; the sound switch already exists in settings.

## v1.6 — decorations: decide what they are for (was v1.5.5)
Right now the decorations (4 for the hive, 4 for the garden) just stand in their places and animate; you put one out or away by tapping the spot. That is not enough: it is unclear to the player why to collect them. To decide:
- **Purpose.** A small bonus for each placed decoration (for example +1–2% hive honey or garden nectar), a bonus for a complete set of a place, or pure cosmetics with an album.
- **Placement.** Fixed spots (as now) or free placement by dragging; how many spots in the hive and the garden; whether to save the positions.
- **Link to style.** Themes/sets (for example "fair": bunting + lanterns) that change the hive background or lighting, seasonal decorations for events.
- **Getting them.** Only surprise combs and the Shop, or also weekly tasks and streak rewards; what to do with duplicates.
- **New decorations.** More than 8? We need art in the "honey crystal" style and animations for each.
- **Interface.** A separate "Decorations" screen (all items, where they stand, which spots are free) instead of searching in the album.
