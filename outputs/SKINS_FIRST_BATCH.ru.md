# Первые игровые скины — revision 17

Проверено: типы без ошибок, 13 тестов пройдены, веб- и Android-экспорты собраны. В браузере проверено включение 39 сочетаний (13 пчёл × 3 скина), без дублирования аксессуаров и с одной короной на уровне 10. На уровне 9 корон нет. Проверены повторяющиеся взмахи, моргание за неподвижной оправой и пауза. Визуально просмотрены Жужа и Борис, крупно и в игровом размере. Ошибок браузера нет. Физическое устройство пока не проверено.

Подготовлены шарфик, очки и рюкзак для всех 13 пчёл. Это отдельные слои внутри движения корпуса, совместимые с короной уровня 10. Наряды используют существующие игровые идентификаторы scarf, glasses и backpack.

Шарфик Бориса сохранён; у остальных скорректирована высота, для Пушинки и Марго он расположен ниже воротничка. Очки имеют прозрачные отверстия и не сжимаются при моргании. Зоркая сохраняет свою встроенную оправу вместо второй пары. Рюкзак расположен за корпусом, сбоку, под крылом. Встроенные украшения персонажей сохраняются.

Тестовый экран «Наряды» позволяет выбрать любую пчелу, уровни 1/9/10, сравнить три скина и вариант без наряда, посмотреть размер 48 px рядом с сотой. Новая графика пока включена только в тестовом просмотре. Остальные пять скинов и проверка на устройстве остаются следующими этапами.

## Генерация

Встроенный image_gen, transparent_background=true. Исходные PNG сохранены без изменения пикселей; их прозрачные границы учитываются через SVG viewBox в приложении.

### Очки

Основа: zorkaya-reference.png.

Extract only the gold round spectacle frames worn by this cartoon bee, as one isolated game accessory. Remove the entire bee, eyes, wings, cheeks and all other objects. Keep the gold rims, thin curved bridge and brown side arms with the same three-quarter view: left lens slightly larger, right lens smaller. Both lens openings are completely empty transparent holes, no glass, no tint, no eye or face inside. Warm softly shaded large facets, matching reference style. Frame only, centered with generous padding. Actual transparent background and transparent lens holes. No text.

### Рюкзак

One isolated small mint-green backpack accessory for a friendly faceted cartoon bee in Buzzle game. Three-quarter side view, bag side facing viewer, compact rounded rectangular shape, simple flap with small brown clasp, tiny side pocket and short brown straps. Soft large facets, low contrast shading, warm light upper left; cozy honey-crystal style matching the reference, no detailed polygon mosaic. Backpack only, no bee or body, no face, no mannequin, no labels. Centered with generous padding, actual transparent background, no ground shadow. Designed to attach at the left side of a bee under the wing.
