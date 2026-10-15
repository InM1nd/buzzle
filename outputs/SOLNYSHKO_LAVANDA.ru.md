# Солнышко и Лаванда

Просмотр: http://127.0.0.1:8099/?beePreview=1&revision=11

На вкладке «Пять пчёл» показаны Жужа, Пушинка, Борис, Солнышко и Лаванда. Нажмите на персонажа для крупного вида. Новые рисунки также подключены к тестовой коллекции и улью; сохранение игрока не используется.

Солнышко: лимонный корпус, медово-оранжевые полосы, золотистые крылья и подсолнух. Лаванда: сиреневый корпус, фиолетовые полосы и крылья, веточка лаванды. Внешний вид основан на одобренной Жужe, с теми же мягкими гранями и освещением. Рисунки получены встроенным imagegen с прозрачным фоном и пока требуют визуального согласования.

У обоих подключены непрерывные взмахи, моргание и покачивание. Подогнаны маски и цвета лица под закрытыми глазами. Цветочные украшения пока встроены в исходные картинки. Отдельные короны и игровые скины для этой пары ещё не подготовлены; Борис сохраняет одобренные корону и шарфик.

Проверено: TypeScript, экспорт web и Android JS/Hermes, пять тестов анимации и аксессуаров. В браузере у новой пары подтверждено многократное движение крыльев и глаз, просмотрены крупные карточки, коллекция и улей. Настоящее устройство ещё не проверено.

Файлы рисунков: `solnyshko-reference.png`, `lavanda-reference.png`. Скриншоты: `solnyshko-in-app.png`, `lavanda-in-app.png`, `bees-five-collection.png`, `bees-five-hive.png`. Код и ассеты включены в обновлённый `zhuzha-prototype-source.zip`.

## Промпты

Метод: встроенный imagegen, редактирование `zhuzha-reference.png`, transparent_background=true.

### Солнышко

Use case precise-object-edit. Create Solnyshko, ONE transparent bee game sprite derived from supplied approved Zhuzha. Exact same camera, pose, eye/mouth coordinates, wing attachment points, legs, antennae, scale, framing and 1366x1151 canvas. Remove crown. Preserve single continuous body silhouette, not segmented head and abdomen. Body sunshine pale lemon-yellow, stripes warm burnt honey-orange, wings translucent soft pale gold. Add ONE small sunny sunflower attached beside left antenna, above forehead, not covering eye, with simple broad softly faceted petals and brown center. Same softly visible broad polygon facets, warm upper-left light, shiny black faceted eyes, pink cheeks, happy smile. No fluff collar or mane. Distinct but consistent with reference bee. No text, background, shadows beneath, border, glow, extra objects. Genuine alpha transparent background.

### Лаванда

Use case precise-object-edit. Create Lavanda, ONE transparent bee game sprite derived from supplied approved Zhuzha. Exact same camera, pose, eye/mouth coordinates, wing attachment points, legs, antennae, scale, framing and 1366x1151 canvas. Remove crown. Preserve single continuous body silhouette, not segmented head and abdomen. Body pastel lavender lilac, stripes deeper muted violet, wings translucent pale lilac. Add ONE small sprig of lavender beside left antenna, above forehead, tiny green stem and leaves with few purple florets, not covering eyes. Same softly visible broad polygon facets, warm upper-left light, shiny black faceted eyes, pink cheeks, happy smile. Brown antennae and feet. No fluff collar or mane. Distinct but consistent with reference bee, soft broad facets not fine triangulation. No text, background, shadows beneath, border, glow or other objects. Genuine alpha transparent background.
