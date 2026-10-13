# Борис: корона и первый скин

Просмотр: http://127.0.0.1:8099/?beePreview=1&revision=10

Вкладка «Наряды» показывает четыре сочетания: обычный Борис, корона, шарфик, корона с шарфиком. В «Три пчелы», «Улей» и «Коллекция» можно менять уровень Бориса и надевать шарфик кнопками сверху.

Корона — отдельный слой, включается на уровне 10. На уровнях 1–9 рисунок Бориса одинаковый, короны нет. Шарфик — отдельный слой существующего игрового скина `scarf`, доступный независимо от уровня. Обе детали привязаны к корпусу и повторяют его покачивание; крылья и глаза анимируются отдельно. Базовый одобренный Борис не перерисован.

Проверено: TypeScript, web-экспорт, Android JS/Hermes-экспорт, пять проверок анимации и аксессуаров. В браузере проверены четыре сочетания и смена уровня: корона исчезает при переходе на уровень 5, шарфик остаётся. На настоящем устройстве пока не проверено.

Ассеты: `boris-crown.png`, `boris-scarf.png`; просмотр — `boris-accessories-grid.png`, крупный вид — `boris-crown-scarf-in-app.png`. Исходники и ассеты включены в обновлённый `zhuzha-prototype-source.zip`.

Корона и шарфик Бориса утверждены пользователем. Пока подготовлены эти аксессуары только для Бориса. Жужа остаётся с короной в исходной картинке, другие скины ещё не перенесены.

## Промпты

Использован встроенный imagegen с transparent_background=true; рисунок Бориса служил образцом камеры и стиля.

### Корона

Asset: standalone crown accessory cutout for the supplied bumblebee game sprite. Reference bee is STYLE and CAMERA guidance only; do not include any bee. ONE golden honey crown, low-poly broad softly shaded facets, rounded gold bead tips, small turquoise and coral gemstone details, soft warm upper-left light, camera three-quarter front matching bee. Low wide crown with five tips, gently elliptical curved base band, readable miniature silhouette. No extra pedestals or shadows underneath. Center crown alone, tightly framed with transparent padding and actual alpha background. No text, no bee, no face, no scene, no mockup. Intended as separate overlay sitting between bee's antennae; clean crisp alpha edges.

Уточняющее редактирование:

Edit this crown: remove EVERY trace of the surrounding yellow/orange glow, haze, drop shadow, aura and background pixels. Keep only the solid crown with crisp clean alpha edge. Preserve crown shape, colors, jewels, broad facets and lighting exactly. Transparent pixels immediately outside its silhouette, including all valleys between crown points. No black background. Genuine transparent cutout, no glow whatsoever. Same framing and dimensions.

### Шарфик

Asset: ONE standalone coral-orange scarf accessory cutout for reference bumblebee game sprite. Bee is camera and visual style reference only, do NOT draw bee. Create only scarf in shape fitted around stout rounded bee below its face: wide soft low-poly cloth curved collar band, elliptical slight U shape, upper edge low in center, upper-left end a little higher; three-quarter front view matching supplied bee, small tidy knot at viewer-right with two short hanging tails. Warm coral red-orange palette, broad subtle facets, warm upper-left soft lighting. Material soft cloth, not glossy plastic, not angular crystalline shards. One coherent scarf, no other objects. Center and tightly frame accessory on actual transparent background with padding, clean alpha edges. No bee, mannequin, face, neck, text, shadows underneath, scenery or border. It will be overlaid onto dark fluffy chest under smile in game.

Уточняющее редактирование:

Edit this scarf cutout: remove ALL surrounding orange/red glow, haze, shadow and background pixels. Keep only the solid scarf, crisp alpha edges and transparent space inside its U shape. Preserve shape, coral colors, broad facets, knot, tails and light exactly. Genuine transparent pixels immediately outside the cloth, no glow or aura whatsoever. No black background, no other objects. Same framing and dimensions.
