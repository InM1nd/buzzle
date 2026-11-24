# iOS WebView performance: the puzzle screen

Report: the Telegram Mini App (web build, https://inm1nd.github.io/buzzle/) lags on iPhones in the **puzzle** (honeycomb
board). The reported device is an iPhone 16 Pro Max (120 Hz ProMotion). Android and desktop are fine.
Branch: `ios-webview-perf`. Line numbers refer to this branch.

## How this was investigated

- Read through the puzzle screen (`src/screens/GameScreen.tsx`), the shared UI (`src/ui/*`) and the App shell, plus the
  react-native-web 0.21.4 internals the puzzle relies on (`Image`, `Animated`, responder events).
- Ran a headless Chrome probe on both builds (`expo export -p web` + `scripts/telegram/postprocess.py`, mocked Telegram,
  430×932 @3x, CPU throttled 4×). The probe starts the daily puzzle in **English**, drags a real 6-tile chain and
  commits it. Each phase records Chrome `Performance.getMetrics` deltas and rAF frame gaps.
- Chrome does not reproduce WebKit's painting behaviour. Its numbers show the **JS / React** part of the cost, and the
  paint-side findings below are based on how WebKit works. They need confirming on a real iPhone (see the last section).

| phase (4× CPU throttle) | JS before → after | task time before → after | long frames (>25 ms) |
|---|---|---|---|
| round start (56 tiles fall) | 640–726 ms → 285–297 ms | 1058–1189 ms → 639–698 ms | 3–4 → 3–4 (screen mount) |
| drag a 6-tile chain | 243 ms → 163 ms | 442 ms → 374 ms | 1 → 1 |
| commit (pops, falls, float text, bee zip) | 567–630 ms → 271–301 ms | 898–990 ms → 618–678 ms | 5 → 1–4 |
| elements with an SVG `url()` filter on the board | 56 idle / 62 while selecting → **0** | | |
| board `touch-action` (English UI) | `auto` → **`none`** | | |

The game result was the same in every run (same chain, same score 96). A screenshot comparison after the move differs
in 6 of 3.6 M pixels, all of them in the animated scene art outside the board.

## Findings, ranked by likely impact on iOS

### 1. 56 SVG filters under the board (react-native-web `tintColor`): high (iOS-specific)
- The empty sockets under the tiles were 56 `<Image tintColor={C.boardEdge}>`
  (previous `GameScreen.tsx:570-573`, now `slotLayer`, `GameScreen.tsx:417`).
- react-native-web draws `tintColor` as a per-element SVG filter: `filter: url(#tint-N)` with its own
  `<svg><filter><feFlood/><feComposite/>` (`node_modules/react-native-web/dist/exports/Image/index.js:76`).
- WebKit/WKWebView renders SVG reference filters on the CPU, and it re-runs them whenever the area repaints. Animated
  tiles in the puzzle use 2D transforms, which WebKit paints into the same layer as the board. As a result, every frame of
  a falling, selected or popping tile re-filters the sockets under it. Chrome/Skia handles this much more cheaply, which
  would explain why Android and desktop feel fine.
- The white "selected" glint on each chained tile was a seventh kind of SVG filter, mounted and unmounted during the drag
  (`GameScreen.tsx:83`).
- **Fixed (web only):** `src/ui/tint.web.ts` renders the tinted copy once to a canvas and turns it into a data URI. It uses
  the same maths as the filter (flood colour, `source-in` alpha). The sockets and the glint now use that bitmap. Native
  keeps `tintColor` (`src/ui/tint.ts` returns `null`). The tab icons already used this approach (`src/ui/TabIcon.web.tsx`).

### 2. Every running animation re-renders its React component on every frame: high, and it scales with 120 Hz
- On web there is no native driver. In RNW 0.21, `useAnimatedProps` reacts to each JS-driver frame with
  `scheduleUpdate()`, which is a React re-render of the animated component
  (`node_modules/react-native-web/dist/vendor/react-native/Animated/useAnimatedProps.js:55`).
- In the puzzle, that means:
  - Round start: 56 tile springs, so 56 component renders per frame.
  - Each commit: every falling tile, plus 6 animated nodes per popped tile (image plus 5 particles), the float texts and
    the zipping bee with its 5-star trail.
  - During a drag: a scale spring per selected tile.
- The work is per rAF tick. If WKWebView runs rAF at 120 Hz on ProMotion, that is twice the work per second compared with
  a 60 Hz Android phone.
- **Fixed (web only):** `src/ui/webAnim.ts` (`useDomAnim`). The same `Animated.Value`s, springs and timings, so the same
  motion curves, now write `transform`/`opacity` straight to the element through value listeners. There is no React
  render per frame. This applies to `CellView` (`GameScreen.tsx:86`), `Pop` (`:139`), `FloatText` (`:208`) and
  `ZipBee` (`:238`). The native branch still renders the original `Animated.View` with the native driver.
- Not converted (small or short-lived):
  - the moves pulse and the board shake (`GameScreen.tsx` HUD and `boardWrap`)
  - the `Press` / `GameButton` squish (`src/ui/components.tsx:30-118`)
  - the bee's wing flap inside `ZipBee` (`src/ui/TurnBee.tsx:31`, about 1 s per big combo)

### 3. App-wide 1 Hz re-render during a round: medium
- `App.tsx:186` ticks `now` every second and re-renders `Main`. That re-renders `GameScreen` with fresh `rules` /
  `dayColor` objects and inline callbacks, so the whole HUD, dock and socket layer reconcile every second, including
  mid-drag.
- **Fixed (web only):** `clockPaused` now also covers a running puzzle round on web (`App.tsx:126`,
  `src/logic/clock.ts`). This is the same mechanism v1.6.1 already used for the cinematic and Night Flight. Production
  is timestamp-based and `finishRound` ticks first, so nothing is lost (`tests/clock.test.ts`).
- The socket layer is now memoised (`GameScreen.tsx:418`), so path changes during a drag no longer reconcile 56
  `Image` components each time. This is memoisation only and applies on all platforms with no behaviour change.

### 4. `touch-action: none` only applied in Russian: medium (input latency, gesture conflicts)
- `scripts/telegram/postprocess.py` set `touch-action:none` through `[aria-label="Игровое поле"]`. That is the Russian
  board label: `game.board` is "Game board" in English and "Ігрове поле" in Ukrainian
  (`src/i18n/strings/common.ts:116`). The probe confirmed `touch-action: auto` on the English board.
- Without it, iOS runs its pan, zoom and double-tap gesture recognisers on the board while the player drags. Touches can
  be delayed or cancelled (`touchcancel` ends the chain), and the WebView can rubber-band.
- **Fixed:** the board has `nativeID="bzz-board"`, and the CSS rule matches `#bzz-board` (the old selector is kept). The
  same rule is also set inline on web (`GameScreen.tsx:842`), so dev builds get it too.

### 5. Board repaints include the full-screen scene art underneath: medium (WebKit paint)
- The puzzle backdrop is a full-screen `background-size: cover` image of the large scene art (`App.tsx`, `sceneBg("puzzle")`).
- Non-composited tile motion dirties the board area, and WebKit repaints every layer below it in that rect, including
  that scaled image.
- **Fixed (web only):** the board wrapper is its own compositing layer (`will-change: transform`, `GameScreen.tsx:840`).
  Tile motion now repaints only the board layer. This costs roughly one board-sized backing store (about 7 MB at 3×).

### 6. Smaller costs, not changed
- **`CountUp`** (`src/ui/components.tsx:136`): a 16 ms `setInterval` that re-renders a `Text` for about 450 ms after each
  move. It is cheap, but it is not frame-aligned.
- **`Bar`** (`src/ui/components.tsx:193`): animates `width` with `useNativeDriver: false`, which means a layout per frame
  for 450 ms after each move. Switching to `scaleX` would distort the rounded ends, so it was left alone to keep visuals
  unchanged.
- **Haptics:** `hTick()` on every path step (`GameScreen.tsx:559`) sends one Telegram `HapticFeedback` IPC message per
  tile. It is async and cheap.
- **Responder system:** react-native-web attaches its touch listeners to `document`, and iOS treats those as passive, so
  scrolling is never blocked. `locationX` (one `getBoundingClientRect`) is read only on grant.
- **Hint and ghost loops:** these use `Animated.loop(..., useNativeDriver: true)`, which on web runs a single pass (see
  the note in `src/ui/anim.ts:11`). They are cheap, but on web they pulse once instead of looping. This is a pre-existing
  visual difference and was not changed.
- **Tile art size:** the tiles are `.webp` art drawn at about 50 CSS px. WebKit resamples them on each repaint of a
  non-composited tile. If iPhone traces still show heavy "Paint" after these fixes, the next step would be web-sized
  tile art (about 160 px).
- **Ruled out for the puzzle:** `backdrop-filter`, CSS `blur`, SVG filters other than tint, Reanimated (not a dependency)
  and rAF loops outside Animated. `box-shadow` is used only on the static HUD and chips.

## Needs a real iPhone (Safari Web Inspector)

Headless Chrome cannot show WebKit's paint or compositing costs, or the actual rAF rate on ProMotion. To check:

1. On the iPhone, go to Settings → Apps → Safari → Advanced and enable **Web Inspector**. Connect the phone to a Mac by
   cable. On the Mac, open Safari → Settings → Advanced and enable "Show features for web developers".
2. Telegram's WebView is inspectable only when Telegram allows it. Telegram's "Debug Mini Apps" docs describe a
   debug-menu switch, *Allow Web View Inspection*, that turns it on. Alternatively, open
   https://inm1nd.github.io/buzzle/ in iPhone Safari, which uses the same WebKit engine without the Telegram chrome.
3. On the Mac, choose Safari → Develop → *iPhone* → the page. Open **Timelines**, enable *JavaScript & Events*,
   *Layout & Rendering* and *Rendering Frames*, then record:
   - starting a daily puzzle (tiles fall),
   - dragging a long chain,
   - committing a 6+ chain (pops, bee zip),
   - 10 s idle.
4. Compare `main` against this branch:
   - Rendering Frames: the bars should stay under the 8.3 ms (120 Hz) or 16.7 ms line.
   - Layout & Rendering: look at "Paint" and "Composite" time, and check whether any paint record mentions filters.
   - JavaScript: per-frame script time should no longer show React commits during tile animations.
5. **Layers** tab: check that the board is its own layer and see how many layers there are. Check that memory stays
   reasonable, because the board layer is about 7 MB.
6. **rAF rate:** in the console, run
   `let n=0,t=performance.now();(function f(){n++;performance.now()-t<1000?requestAnimationFrame(f):console.log(n)})()`.
   About 120 means ProMotion rAF is active, about 60 means it is capped, and about 30 means Low Power Mode (which halves
   rAF on iOS and is worth asking the reporter about).
7. **Touch:** in the Elements tab, check that `#bzz-board` has `touch-action: none` in English and Ukrainian. While
   dragging, the Console should show no `touchcancel`-driven chain resets.
