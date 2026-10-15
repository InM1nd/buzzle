# Посадка аксессуаров · revision=20

Просмотр: http://127.0.0.1:8099/?beePreview=1&revision=20

По замечанию пользователя revision=19 не принят: корона выглядела отдельным пустым кольцом, шарф — толстым гранёным обручем. В revision=20 корона заново извлечена по форме короны Жужи: сохранены пропорции, пять вершинок и широкая передняя полоса без видимого пустого нижнего кольца. Корона Жужи остаётся исходной. Посадка повторяет её ракурс и прилегание к голове; для Бориса используется отдельный размер.

Шарф заменён рисунком с мягкими складками, уменьшены высота повязки и хвостики. Для Пушинки и Марго он расположен под кремовым воротником, для Бориса — под пушистой гривой. В общий просмотр добавлена пара: Жужа и выбранная пчела. Можно переключать персонажей и скины, сравнивать уровни.

Это новая версия для визуальной оценки; пользователь её ещё не утверждал. Предложение для уровня 5 из revision=19 оставлено без изменений и тоже ожидает оценки. Основная игра пока использует прежнюю графику.

Новые прозрачные изображения: crown-fitted-v3.png, scarf-fitted-v3.png. Созданы встроенным image_gen, альфа сохранена, файлы изображений после генерации не редактировались. Рамки и размеры задаются при отображении в приложении.

Проверка типов и 16 тестов аксессуаров/анимации прошли. Проверены в браузере общая сетка и сравнения Жужи с Пушинкой и Борисом. Настоящее устройство пока не проверено.

## Запросы генерации

Корона:
Use case: background-extraction. Extract ONLY the exact golden crown from the attached Zhuzha bee into a transparent PNG. This is not a redesign. Keep the exact camera angle, five golden ball-tipped triangular points, cyan and coral gemstones, warm faceted shading and broad front band with nearly horizontal lower edge. Remove bee, head, antennae, wings entirely; reconstruct only the tiny crown parts hidden behind antennae. No visible hollow ellipse on the bottom, no dark inner ring, no added pedestal. Crown must have exactly the same proportions as the original reference, not wider, not flatter. Tight clean transparent cutout with modest transparent margin. No cast shadow outside crown, no text.

Шарф:
Use case: precise-object-edit. Create a replacement transparent game accessory for the attached orange scarf. Supporting image bee defines warm honey-crystal style and camera angle. Change scarf into THIN SOFT FABRIC tied around this bee, NOT a thick polygon ring, NOT a gemstone. Narrow curved wrap, two softly folded overlapping bands, gentle broad color transitions with only 4-6 subtle facets in entire scarf. Coral orange cloth, muted warm highlights, no shiny triangular mosaic. View in same slight three-quarter perspective as bee looking right. Wrap front is shallow curved U, left attachment higher and recedes, right knot near cheek small compact soft knot. Two short slender hanging tails at right, pointing mainly down with one slightly right. No large bow loops. Band thickness only 10% of total wrap width; including tails total height about 30% width. On transparent background scarf alone, empty inside, no bee, no face, no wings, no shadow outside, no text. Small enough for it to sit below smile and reveal belly stripes.

