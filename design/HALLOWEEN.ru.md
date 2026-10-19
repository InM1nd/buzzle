# Хеллоуин-ивент «Тыквенная ночь» (v1.6): ассеты и промпты

Окно ивента: **20 октября – 9 ноября** (3 недели, 21 день включительно; награды можно забрать до 12 ноября), календарь вшит в приложение, всё офлайн. Ночной полёт доступен только в эти даты; фоны: событие → сезон → по умолчанию (см. `src/logic/scene.ts`).
Ивент — обёртка над тем, что уже есть: без новых валют и новых вкладок.

Что входит:
1. Тыквенные соты в головоломке → очки ивента → дорожка наград (12 шагов, 450 очков).
2. Ночной улей и сад на время ивента.
3. Хеллоуинские костюмы пчёл (через систему скинов).
4. «Гадость или сладость»: раз в день гость у двери улья.
5. Тыква в саду → вырезать фонарь → украшение улья.
- A. Мини-игра «Ночной полёт» (полёт за нектаром в хеллоуинской версии, после ивента остаётся дневной).
- B. «Призрачные соты»: призрак перепрыгивает по полю головоломки, пойманный в цепочку даёт бонус и очки ивента.

Пропущено: задания-история «Жужа и привидение» (костюм получаем с дорожки наград).

## Общие правила

- **Формат:** PNG с прозрачным фоном (кроме фонов), sRGB. В WebP переводит код (`scripts/`), присылать не нужно.
- **Куда класть:** `design/2d/halloween/<раздел>/<имя>.png`, имена — как в таблицах ниже.
- **Стиль:** «медовый кристалл» — low-poly, крупные грани, мягкий тёплый свет сверху слева, без контуров.
  Ориентиры: `assets/art/cell0.webp` (тайл), `assets/art/env/hive_bg.webp` (фон), `assets/art/items/deco_lanterns.webp` (украшение),
  `assets/art/garden/sunflower_bloom.webp` (растение), `design/2d/all-species-accessories-v1/pushinka/` (слои костюмов).
- **Ночная палитра ивента:** глубокий сливовый `#2B1B3D`, индиго `#3A2F5B`, тыквенный `#F08A24`, тёплый свет свечи `#FFC56B`,
  мятно-призрачный `#BFF5E6`. Ночь уютная, не страшная: никакой крови, черепов, хоррора.
- Размеры ниже — минимальные; больше можно, если сохранены пропорции.

### Общий стилевой блок (добавлять в конец каждого промпта)

```
Style: cozy casual mobile game art, "honey crystal" low-poly look — large clean planar facets, soft gradients
inside each facet, warm key light from the upper left, gentle ambient occlusion, no outlines, no text, no
watermark, no signature. Cute and friendly Halloween mood, not scary: no blood, no skulls, no gore.
Match the attached reference images exactly in rendering style, facet size and lighting.
```

Для объектов на прозрачном фоне добавлять ещё:

```
Single isolated object, centered, fully inside the canvas with ~6% padding, true transparent background
(alpha), no ground shadow unless asked, no background scenery.
```

---

## 1. Тыквенные соты и дорожка наград

| Файл | Размер | Ориентир |
|---|---|---|
| `tiles/cell_pumpkin.png` | 240×208 | `assets/art/cell0.webp`, `assets/art/cell_wild.webp` |
| `ui/event_point.png` | 96×96 | `assets/art/drop.webp`, `assets/art/honey.webp` |
| `ui/event_header.png` | 1000×400 (фон, без прозрачности) | `assets/art/env/hive_bg.webp` |

**cell_pumpkin** — шестиугольник в той же сетке, что `cell0…4`. Должен отличаться от пяти цветов, джокера и бомбы.

```
A hexagonal puzzle tile, pointy-top hexagon, exact same shape, size, bevel and lighting as the attached
reference tile (Image 1). The tile face is a glossy pumpkin-orange crystal with a small cute carved
jack-o'-lantern face (friendly smile, two triangle eyes) glowing softly warm yellow from inside, a tiny green
stem and curled leaf at the top edge. Orange must be clearly different from the reference yellow/honey tile.
Canvas 240x208, the hexagon fills the canvas like the reference.
```

**event_point** — маленькая тыковка, иконка очка ивента (летит в счётчик, стоит в заданиях).

```
A tiny round pumpkin icon, pumpkin orange with soft faceted ribs, short green stem, one small curled leaf,
a faint warm glow. Reads clearly at 24 px. Same rendering as the attached resource icons (honey jar, drop).
Canvas 96x96.
```

**event_header** — шапка экрана дорожки наград (текст поверх добавит код).

```
Wide banner illustration, 1000x400. Night meadow under a big soft full moon, a row of glowing carved
pumpkins on the grass, thin cobweb in the upper corner, a few fireflies, plum and indigo sky. Keep the
center-left area calm and darker for overlaid title text. Same environment style as the attached hive
background.
```

---

## 2. Ночной улей и сад

| Файл | Размер | Ориентир |
|---|---|---|
| `env/hive_bg_night.png` | 940×1672 | `assets/art/env/hive_bg.webp` |
| `env/garden_bg_night.png` | 940×1672 | `assets/art/env/garden_bg.webp` |

Та же композиция, что у дневных фонов: середина остаётся спокойной и читаемой (на ней соты и грядки),
сверху место под панель валют, снизу под панель вкладок. Анимацию светлячков и мерцание сделает код.

**hive_bg_night**

```
Night version of the attached hive background (Image 1). Keep the exact same composition, perspective and
honeycomb crystal shapes, but relight it as a cozy Halloween night: deep plum/indigo ambient, a big soft
moon glow in the upper corner, a few small glowing jack-o'-lanterns and string lights near the edges, a
couple of tiny fireflies. The central area stays calm, slightly lighter and low-contrast because UI sits on
top of it. Top 12% and bottom 12% stay simple (UI bars). Portrait 940x1672, full-bleed, no transparency.
```

**garden_bg_night**

```
Night version of the attached garden background (Image 1). Same composition, rocks, grass and hills,
relit as a cozy Halloween night: indigo sky with a soft moon, warm lantern light pools on the grass, a few
small pumpkins and fireflies near the edges. The lower half (where the garden beds sit) stays lighter and
readable, low contrast. Top 12% and bottom 12% stay simple. Portrait 940x1672, full-bleed.
```

---

## 3. Костюмы пчёл

Как устроены скины: костюм — **отдельный прозрачный слой 512×512** на том же холсте и с тем же центром,
что исходники в `design/2d/all-species-accessories-v1/<пчела>/`. Нужны **3 ракурса**: `front`, `q3-front`, `side`
(левые ракурсы игра получает зеркалом). Рисуем на **одной опорной пчеле — Пушинке**; на остальные 12 видов
слой переносится черновой посадкой (`scripts/import_bee_layers.py`), неудачные места правим точечно.

Слои: **front-слой** рисуется поверх тела, **back-слой** — за телом (плащ, крылья).
Тело пчелы в слой не входит — только костюм на прозрачном фоне.

| Костюм (id) | Файлы на ракурс | Слои |
|---|---|---|
| Шляпа ведьмы (`witchhat`) | `costumes/witchhat-{front,q3-front,side}-view.png` | front |
| Тыква-шапка (`pumpkinhat`) | `costumes/pumpkinhat-{...}-view.png` | front |
| Плащ вампира (`vampcape`) | `costumes/vampcape-front-{...}-view.png` + `costumes/vampcape-back-{...}-view.png` | front (воротник) + back (плащ) |
| Крылья летучей мыши (`batwings`) | `costumes/batwings-back-{...}-view.png` | back |
| Капюшон-привидение (`ghosthood`) | `costumes/ghosthood-{...}-view.png` | front |
| Венок с тыковками (`pumpkinwreath`, по желанию) | `costumes/pumpkinwreath-{...}-view.png` | front |

Ориентиры к каждому костюму: Image 1 = `pushinka/<ракурс>-base-view.png` (тело), Image 2 = `pushinka/beret-<ракурс>-view.png`
(как сидит головной убор), для плаща и крыльев ещё `pushinka/bag-<ракурс>-view.png`.

**Базовый промпт костюма** (подставить `{VIEW}` = straight front / three-quarter front / side profile, и описание костюма):

```
Image 1 is the bee character Pushinka in the {VIEW} view on a 512x512 canvas. Image 2 is an existing
accessory layer for the same view, showing how accessories are fitted and rendered. Draw ONLY the new
accessory described below, as a separate layer on the SAME 512x512 canvas, in the exact position, scale and
perspective where it would sit on the bee in Image 1. Do NOT draw the bee body, wings, eyes or antennae;
everything except the accessory must be fully transparent. Antennae must be able to poke through/around
headwear naturally. Same low-poly facets and upper-left lighting as Image 2.
Accessory: {COSTUME}
```

Описания `{COSTUME}`:

- **witchhat:** `a small soft witch hat, deep plum fabric with a slightly bent tip, an orange band with a tiny golden buckle, worn tilted on the top of the head between the antennae.`
- **pumpkinhat:** `the top half of a small carved pumpkin worn as a helmet/cap, pumpkin orange with soft ribs, a short green stem and a curly vine on top, a little zigzag carved rim; it covers only the top of the head, the eyes stay fully visible.`
- **vampcape (front):** `a tall stand-up vampire collar, black outside and deep red satin inside, with a small golden clasp under the chin.`
- **vampcape (back):** `the vampire cape behind the body: black outside, deep red satin inside, falling from the shoulders behind the bee, slightly flaring; it must NOT cover the translucent bee wings.`
- **batwings (back):** `a pair of small cute bat wings in dark plum, scalloped edges, attached behind the upper body, placed BELOW and slightly behind the bee's own translucent wings so both pairs stay visible.`
- **ghosthood:** `a soft white sheet hood like a little ghost costume, covering only the top of the head and falling to the shoulders, a faint mint glow on the edges, eyes and face fully visible.`
- **pumpkinwreath:** `a small wreath of autumn leaves, acorns and three tiny pumpkins worn on the top of the head.`

Иконку костюма для лавки и альбома отдельно рисовать не нужно — её рендерит код (костюм на Жуже).

---

## 4. «Гадость или сладость»

| Файл | Размер | Ориентир |
|---|---|---|
| `trick/door.png` | 600×600 | `assets/art/items/deco_lanterns.webp`, `assets/art/comb.webp` |
| `trick/basket.png` | 256×256 | `assets/art/items/box_wood.webp` |
| `trick/trick_hat.png`, `trick/trick_glow.png`, `trick/trick_ghost.png` (по желанию) | 128×128 | `assets/art/drop.webp` |

Пчелу-гостя в костюме подставит код из готовых спрайтов.

**door** — сцена окна-события: вход в улей ночью.

```
The round honeycomb-shaped entrance door of a cozy beehive at night, warm candle light spilling from
inside, a small hanging lantern beside it, a carved pumpkin on the doorstep, a few autumn leaves. Leave
empty space in front of the door (lower center) where a visiting bee will be placed by code. Isolated
object, transparent background, 600x600.
```

**basket** — сладость.

```
A small pumpkin-shaped trick-or-treat basket with a handle, full of colorful wrapped candies and a honey
lollipop sticking out. Isolated, transparent background, 256x256.
```

**trick-иконки** (по желанию): `a witch hat flying off with a puff`, `a soft green magic glow swirl`, `a tiny cute ghost peeking` — каждая
`small game icon, readable at 32 px, isolated, transparent background, 128x128.`

---

## 5. Тыква в саду и фонари

| Файл | Размер | Ориентир |
|---|---|---|
| `garden/pumpkin_bud.png` | 249×249 | `assets/art/garden/sunflower_bud.webp` |
| `garden/pumpkin_bloom.png` | 249×249 | `assets/art/garden/sunflower_bloom.webp` |
| `deco/deco_jack_1.png … deco_jack_4.png` | 160×250 | `assets/art/items/deco_lanterns.webp`, `deco_mushroom.webp` |

Росток общий (`sprout`), уже есть. Растение стоит **в грядке**: низ кадра — место, где стебель уходит в землю,
как у остальных растений (код рисует передний бортик грядки поверх стебля).

**pumpkin_bud**

```
A young pumpkin plant: a few broad green faceted leaves, a curly vine and one small green-and-yellow
unripe pumpkin with a tiny orange flower. The stem base is at the bottom center, as if growing from soil.
Same framing, scale and rendering as the attached plant reference (Image 1). Transparent background,
249x249.
```

**pumpkin_bloom**

```
A big ripe round pumpkin, bright pumpkin orange with soft faceted ribs, a thick green stem, two broad
leaves and a curly vine, sitting at the bottom center as if in the soil. Proud, harvest-ready look, a few
tiny sparkles. Same framing, scale and rendering as the attached plant reference (Image 1). Transparent
background, 249x249.
```

**deco_jack_1…4** — четыре фонаря-украшения, отличаются только вырезанным лицом. Стоят на земле.

```
A carved jack-o'-lantern decoration standing on a small patch of grass, glowing warm candle light from
inside through the carved face, a short green stem. Face: {FACE}. Cute and friendly. Same scale, ground
contact and rendering as the attached decoration reference (Image 1). Isolated, transparent background,
160x250 (object at the bottom, empty space above for the glow).
```

`{FACE}`: 1 — `kind wide smile, round eyes`; 2 — `sly grin, one squinting eye`; 3 — `sleepy, closed curved eyes, small yawn`;
4 — `surprised, big round eyes and a small O mouth`.

---

## A. Мини-игра «Ночной полёт»

Камера сбоку, пчела летит слева направо. Свет фонарика вокруг пчелы, мерцание, параллакс и анимацию делает код.

| Файл | Размер | Примечание |
|---|---|---|
| `flight/lantern-side-view.png` | 512×512 | Слой-аксессуар на Пушинке, ракурс `side` (как костюмы) |
| `flight/bg_sky.png` | 1600×900 | Самый дальний слой, без прозрачности |
| `flight/bg_far.png` | 1600×900 | Дальние холмы и лес, прозрачный верх |
| `flight/bg_near.png` | 1600×900 | Ближняя трава и тыквы, прозрачный верх |
| `flight/stem_top.png`, `flight/stem_bottom.png` | 200×900 | Препятствия |
| `flight/bat_1.png … bat_3.png` | 256×256 | Цикл взмаха |
| `flight/candy_1.png … candy_3.png` | 128×128 | Подбиралки |
| `flight/firefly.png` | 64×64 | Подбиралка/частица |
| `flight/icon.png` | 256×256 | Иконка игры на экране «Играть» |

Все три слоя фона должны **бесшовно повторяться по горизонтали** (левый край стыкуется с правым).

**lantern** — базовый промпт костюма (раздел 3) с `{VIEW}` = side profile и:
`a small round paper lantern on a short stick, held in the bee's front leg in front of the body, glowing warm yellow-orange.`

**bg_sky**

```
Seamless horizontally tiling night sky for a side-scrolling game, 1600x900: deep plum to indigo gradient,
a big soft full moon in the upper area, a few faint faceted clouds and small stars. Left and right edges
must tile seamlessly. Calm, low contrast, no ground.
```

**bg_far**

```
Seamless horizontally tiling distant layer for a side-scrolling game, 1600x900: silhouettes of soft rolling
hills and rounded low-poly trees in dark indigo, a tiny glowing window of a far cottage, transparent sky
above the hills (top ~60% transparent). Left and right edges tile seamlessly. Low contrast.
```

**bg_near**

```
Seamless horizontally tiling foreground ground strip for a side-scrolling game, 1600x900: dark faceted grass
along the bottom ~22%, small pumpkins, mushrooms and tall grass blades, a few glowing fireflies; everything
above is transparent. Left and right edges tile seamlessly.
```

**stem_top / stem_bottom** — препятствия в стиле Flappy Bird.

```
A tall vertical obstacle for a side-scrolling flying game: a thick dark-green twisted flower stem wrapped
with thorny vine and a few dark leaves, ending in a {END}. Readable silhouette against a dark indigo sky.
Isolated, transparent background, 200x900, the stem spans the full height.
```

`{END}`: для `stem_bottom` — `closed night flower bud at the top end, growing up from the bottom edge`;
для `stem_top` — `drooping flower hanging down at the bottom end, hanging from the top edge`.

**bat_1…3** — три кадра одного цикла (крылья вверх / середина / вниз), один и тот же зверёк, одинаковый масштаб и центр.

```
A cute small cartoon bat flying, side view facing left, dark plum body, big friendly eyes, tiny fangs,
wings {POSE}. Frame {N} of a 3-frame flap cycle: same character, same scale and same center position in
all frames. Isolated, transparent background, 256x256.
```

`{POSE}`: 1 — `raised fully up`, 2 — `spread horizontally`, 3 — `pushed down`.

**candy_1…3**

```
A wrapped candy pickup for a game, {CANDY}, glossy faceted, small sparkle. Readable at 32 px.
Isolated, transparent background, 128x128.
```

`{CANDY}`: 1 — `orange wrapper with twisted ends`, 2 — `purple striped wrapper`, 3 — `mint-green round lollipop with a honey swirl`.

**firefly**

```
A tiny cute firefly with a glowing warm yellow-green abdomen, readable at 16 px. Isolated, transparent
background, 64x64.
```

**icon**

```
Game mode icon: a cute round bee holding a glowing paper lantern, flying in front of a big soft moon, a
small bat silhouette in the background. Rounded-square composition, readable at 64 px. Transparent
background, 256x256.
```

---

## B. Призрачные соты

| Файл | Размер | Ориентир |
|---|---|---|
| `tiles/ghost_overlay.png` | 240×208 | `assets/art/cell0.webp` (сетка), `assets/art/bomb.webp` (как рисуется спец-элемент) |
| `tiles/ghost_puff.png` (по желанию) | 128×128 | — |

Призрак — **прозрачный слой поверх обычного тайла** любого из пяти цветов, поэтому должен читаться на всех.

**ghost_overlay**

```
A tiny cute ghost overlay for a hexagonal puzzle tile: a small round white sheet ghost with a faint mint
glow, two big dark friendly eyes and a little open smile, floating in the center of the hexagon. It must be
readable on top of yellow, red, blue, green and purple tiles: soft white body with a thin darker edge
shading and a subtle glow. ONLY the ghost on a transparent 240x208 canvas, centered where a tile's symbol
would be (same placement as the bomb in Image 2), no hexagon, no tile.
```

**ghost_puff** (по желанию; иначе сделает код)

```
A small soft puff of mint-white mist, like a ghost just vanished, cute cartoon style. Isolated, transparent
background, 128x128.
```

---

## Приоритет

1. `cell_pumpkin`, `event_point`, `ghost_overlay` — без них не проверить механику.
2. `pumpkin_bud`, `pumpkin_bloom`.
3. Полёт: `lantern`, `bat_1…3`, `stem_top/bottom`.
4. Ночные фоны улья и сада, фоны полёта.
5. Костюмы.
6. `deco_jack_1…4`, сцена «гадости или сладости», `event_header`, иконка полёта.

Пока ассетов нет, код идёт на заглушках; готовые файлы просто кладутся в `design/2d/halloween/`, подключение — за кодом.
