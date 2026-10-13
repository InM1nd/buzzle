# Пушинка и Шмель Борис — первый перенос стиля

Просмотр: http://127.0.0.1:8099/?beePreview=1&revision=8

На вкладке «Три пчелы» показаны Жужа, Пушинка и Борис. Нажатие на персонажа открывает крупный вид; ниже показан размер возле соты. Эти же новые рисунки подключены в тестовой коллекции и улье. Сохранение игрока не используется.

Пушинка — кремовый корпус, карамельные полосы, светлый воротничок. Борис — янтарный корпус, шоколадные полосы и голубые крылья. Оба рисунка получены встроенным imagegen на основе одобренной Жужи, с настоящим прозрачным фоном. Они являются кандидатами для визуального согласования; эталон Жужи сохранён.

Анимация использует те же общие таймеры, взмахи, моргание и покачивание. Маски и места крепления подогнаны отдельно к каждому рисунку. Уровни, наряды, новые ракурсы и короны для этих двух пчёл пока не подготовлены.

Проверено: типы, экспорт web и Android JS/Hermes, четыре теста жизненного цикла анимации; в браузере просмотрены карточки, коллекция и улей. Через несколько секунд работы оба крыла у всех трёх персонажей продолжают двигаться; пауза полностью останавливает движение, продолжение возобновляет взмахи у всех трёх. Проверка на настоящем телефоне остаётся следующим этапом.

Файлы: `pushinka-reference.png`, `boris-reference.png`, `bees-trio-preview.png`, `boris-in-app.png`, `bees-trio-collection.png`, `bees-trio-hive.png`, `bees-trio-animation.webm`. Обновлённый код и ассеты входят в `zhuzha-prototype-source.zip`.

## Промпты генерации

Метод: встроенный imagegen, редактирование одобренной `zhuzha-reference.png`, transparent_background=true.

### Пушинка

Use case: precise-object-edit. Asset: ONE transparent game sprite, Pushinka bee. Edit the reference bee into Pushinka while locking camera, pose, silhouette, eye and mouth positions, legs, antenna positions and wing attachment coordinates. Same canvas 1366x1151 if possible, identical placement and scale. Remove the crown completely. Change golden body to pale ivory cream, dark brown stripes to warm caramel brown. Add a short collar of soft cream chunky faceted fluff below the face, above the stripe, without covering eyes or smile. Wings remain warm ivory translucent and in exactly the same positions. Match reference's softly visible broad polygon facets, warm upper left lighting, black glossy faceted eyes, pink cheeks and happy smile. Keep a single unified body, never separate head and abdomen. Preserve enough warm shading for volume. No crown, text, background, shadow beneath, extra objects, border or redesign of anatomy. Output only Pushinka on genuinely transparent background.

### Шмель Борис

Use case: precise-object-edit. Asset ONE transparent game sprite, bumblebee Boris. Edit the supplied approved bee, preserving exact camera, pose, unified body silhouette, eye and mouth coordinates, leg and antenna coordinates, both wing contours and attachment points, framing and scale. Canvas 1366x1151 if possible. Remove crown entirely. Boris has saturated warm amber-orange yellow body and rich deep chocolate brown stripes; translucent pale ice-blue wings with subtle broad facets. Keep black glossy polygon eyes, tiny warm pink cheeks and happy small smile identical to reference. Same softly visible broad facets, soft warm upper-left lighting. No fine polygon mosaic, no separate head or abdomen, no extra fur collar, no crown, no text, no shadow underneath, no scenery or border. Only one Boris sprite on genuine transparent background, same location and proportions as reference.
