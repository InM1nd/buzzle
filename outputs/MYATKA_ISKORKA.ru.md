# Мятка и Искорка — партия 4

Подготовлены для тестового экрана revision=13. Мятка: мятно-зелёный корпус, тёмно-зелёные полосы, листья. Искорка: коралловый корпус, кирпичные полосы, золотая звезда и светлые золотистые крылья.

Основа — одобренная форма семейства, с сохранением позы и положения глаз. PNG 1366×1151 с исходной прозрачностью. Крылья, глаза и корпус разделяются масками в приложении; движения используют общий механизм. Украшения пока встроены в рисунки, отдельные короны и игровые скины для этой пары не подготовлены. Основная игра пока использует прежнюю графику.

## Инструмент и промпты

Использован встроенный image_gen, редактирование vasilek-reference.png с transparent_background=true. Изображения сохранены в проект и outputs без обработки пикселей.

### Мятка

Edit this approved Buzzle game bee sprite into Myatka (mint bee). Preserve EXACT canvas dimensions 1366x1151, framing, pose, silhouette, all positions of eyes, cheeks, smile, wings and antennae, lighting, broad softly shaded facets and unified body. Only change blue body to soft mint/sage green, dark blue stripes to forest green, blue wings to translucent pale mint green. Replace the cornflower with two small mint leaves and short stem in precisely the same area beside the left antenna. Keep brown antennae and feet, black shiny eyes, pink cheeks. One bee only; no crown, no labels, no ground shadow, no background, no floating objects. Actual transparent alpha background. Preserve all geometry outside the flower replacement; same sprite family and camera.

### Искорка

Edit this approved Buzzle game bee sprite into Iskorka (spark bee). Preserve EXACT canvas dimensions 1366x1151, framing, pose, silhouette, all positions of eyes, cheeks, smile, wings and antennae, lighting, broad softly shaded facets and unified body. Only change blue body to warm coral/salmon, dark blue stripes to rich brick red, blue wings to translucent pale honey gold. Replace cornflower with one small golden five-point star in precisely the same area beside the left antenna. Keep brown antennae and feet, black shiny eyes, pink cheeks. One bee only; no crown, no labels, no ground shadow, no background, no floating glitter. Actual transparent alpha background. Preserve all geometry outside the flower replacement; same sprite family and camera.

## Проверка

Проверяются крупный размер, 48 px возле соты, тестовая коллекция и улей; повторяющиеся взмахи, моргание, покачивание и пауза. Проверка на физическом Android-устройстве остаётся перед переносом в основную игру.


Проверено: типы без ошибок; 5 тестов анимации и аксессуаров пройдены; веб- и Android-экспорты успешно собраны. В браузере за 950 кадров оба крыла и оба глаза меняют состояние у каждой новой пчелы, пауза останавливает движения. Мятка и Искорка присутствуют в тестовом улье и коллекции. Ошибок браузера нет. Физическое устройство не проверено.
