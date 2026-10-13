# Клеверина и Василёк

Просмотр: http://127.0.0.1:8099/?beePreview=1&revision=12

Вкладка «Новая пара» показывает обоих персонажей. Нажмите на пчелу для крупного вида. Вкладка «Семь пчёл» содержит всю подготовленную группу; тестовая коллекция и улей также используют новые рисунки. Сохранение игрока не меняется.

Клеверина (Клевера в концептах): розовый корпус, ягодные полосы, зелёный трёхлистный клевер. Василёк: голубой корпус, тёмно-синие полосы и сине-фиолетовый цветок. Палитра, мягкие грани и свет согласованы с одобренной Жужей.

У обоих работают непрерывные взмахи, моргание и покачивание. Маски крыльев и глаз, точки крепления и цвета под глазами подогнаны к новым рисункам. Цветочные украшения пока встроены в картинки; отдельные короны и игровые скины для этой пары ещё не подготовлены.

Проверено: TypeScript, экспорт web и Android JS/Hermes, пять тестов анимации и аксессуаров. В браузере подтверждено повторение взмахов и моргания, проверены крупный вид и размер возле соты. Настоящее устройство пока не проверено. Внешний вид новой пары требует визуального согласования.

Файлы рисунков: `klevera-reference.png`, `vasilek-reference.png`; скриншоты: `klevera-in-app.png`, `vasilek-in-app.png`. Исходники и ассеты добавлены в `zhuzha-prototype-source.zip`.

## Промпты

Использован встроенный imagegen, редактирование одобренной `zhuzha-reference.png`, transparent_background=true.

### Клеверина

Use case precise-object-edit. Make ONE transparent game bee sprite Klevera (Clovie) from this approved Zhuzha reference. Preserve same three-quarter camera, unified body silhouette, eye and mouth positions, wing roots, legs, antennae, size and framing on same 1366x1151 canvas. Remove crown. Body soft strawberry-pink, broad stripes muted berry rose, wings translucent pale blush pink. Small green THREE-leaf clover beside left antenna on forehead, with three simple heart-shaped leaves and short stem, not covering eye. Brown antennae and feet. Same soft broad low-poly facets, warm upper-left light, black glossy faceted eyes, pink cheeks, gentle smile. No fur, separate head or abdomen, fine triangular mosaic, crown, text, background, glow, shadow under, extra objects. Genuine alpha transparency. Match supplied art closely while making this character recognizable by pink palette and clover.

### Василёк

Use case precise-object-edit. Make ONE transparent game bee sprite Vasilek (cornflower) from supplied approved Zhuzha. Preserve exact same three-quarter camera, unified body shape, eye/mouth coordinates, wing roots, legs, antennae, size and framing on same 1366x1151 canvas. Remove crown. Body soft sky blue, broad stripes deeper muted denim blue, wings translucent pale ice blue. Add ONE small cornflower blossom beside left antenna above forehead: blue-violet broad gently faceted pointed petals, tiny darker center and small green leaf, not covering eye. Brown antennae and feet. Same soft broad low-poly facets, warm upper-left light, black glossy faceted eyes, pink cheeks, happy small smile. No fur or mane, segmented body, sphere anatomy, fine polygon mosaic, crown, text, background, glow, shadow underneath or other objects. Genuine alpha transparency. Match supplied visual language closely while distinguishable through blue palette and cornflower.
