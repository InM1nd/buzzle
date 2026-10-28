# Play Store graphics: brief

## Required assets
| Asset | Size | Format | Notes |
|---|---|---|---|
| App icon | **512 × 512 px** | 32-bit PNG with alpha, ≤ 1 MB | Full square. Play applies the mask and rounded corners itself, so don't add a shadow or rounded corners. Base it on `assets/icon-hive.png`. |
| Feature graphic | **1024 × 500 px** | JPEG or 24-bit PNG (**no alpha**), ≤ 15 MB | Keep logo and text inside the central safe area, away from the edges. It's shown behind a play button on some surfaces, so leave the center calm. |
| Phone screenshots | **1080 × 1920 px** (9:16) | JPEG or 24-bit PNG (no alpha), ≤ 8 MB each | 2–8 per language. Each side must be 320–3840 px, and the long side can be at most 2× the short side. At least 4 are needed for promotion in game surfaces. |

## Best scenes (real captures in `/workspace/play/screenshots/`, English, Classic theme, 1080 × 1920)
1. `01-puzzle-round.png`: daily puzzle board with Hint and the colour of the day. This is the hero shot. Caption: "A honey-sweet puzzle every day".
2. `02-hive.png`: hive combs with bees and the hive level. Caption: "Grow your cozy hive".
3. `03-garden.png`: garden beds and the colour of the day. Caption: "Plant and water a flower garden".
4. `04-bees.png`: bee collection. Caption: "Collect 13 bees".
5. `05-bee-card.png`: bee card with crown and level. Caption: "Level up and dress up your bees".
6. `06-surprise-combs.png`: surprise combs with odds shown. Caption: "Surprise combs — earned, never sold".
7. `08-tasks.png`: daily tasks. Caption: "Daily tasks, streaks and chests".
8. `07-play-tab.png` or `09-free-play-boosters.png`: the daily puzzle card, or free play with boosters (optional).

Known issues in the captures:
- These are raw web-build captures from Pages, with a fixture save and the date set to 19 Oct, so the event is off.
- The puzzle round's "Colour of the day" chip is cut off at this width.
- The garden shot is scrolled a little. A clean Codex pass with a captioned frame is recommended.
- For uk/ru versions, re-capture with `LANG2=uk` or `LANG2=ru` (see `/workspace/review/quick3.cjs`).
