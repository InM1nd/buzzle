# Wild Hive → упрощённый Buzzle

Изучена [официальная Steam-страница](https://store.steampowered.com/app/4864810/Wild_Hive/) и шесть скриншотов: летний и зимний HUD, расширенный улей, нападение, окно вылазок и главное поле с инструментами.

## Наблюдения
На главном экране — общая полоса состояния и улей как игровое поле. Инструменты сгруппированы по краям. В окне вылазок числа и подписи выровнены, подробности выбранной локации раскрываются отдельно. Бумажные панели с тонкой кромкой имеют собственный материал.

Предыдущие v4–v8 были ближе к форме управления: одинаковые округлённые карточки, мелкие пояснения и слабая связь поля с действиями. Перенос квоты сверху вниз не решал причину.

## Решение v9
Одна верхняя полоса, единая нижняя группа инструментов, фактура медовой бумаги/воска, крупные числа и подробности по нажатию. Пиктограммы на сотах открывают назначения тех же трёх групп: это пространственные ярлыки, не новые постройки. Пчёлы, соты, сезонные фоны и Nunito — Buzzle. Климат, рынок, бои и real-time-скорость референса не добавлены.

Изображения Wild Hive не скопированы в ассеты. Панель сгенерирована отдельно по существующим Buzzle comb/hive_bg, точный промпт в ui/generation.json.

## Новые навыки репозитория
Ветка chore/gamedev-agent-skills, commit e5808c3e6ecbb847b3049ba9fa02c51c87b8312b. Прочитаны через Git; ветка приложения не переключалась и не сливалась.

- [game-ui-ux](https://github.com/InM1nd/buzzle/blob/chore/gamedev-agent-skills/.agents/skills/game-ui-ux/SKILL.md) и references/layout-and-flow.md: контейнеры HUD, масштаб только поля; CSS safe-area; стек окон; inert фона; Tab внутри окна; Escape и возврат фокуса; событийные обновления. Размер касания сот поддержан отдельно от масштаба изображения, ≥44 px.
- [game-feel](https://github.com/InM1nd/buzzle/blob/chore/gamedev-agent-skills/.agents/skills/game-feel/SKILL.md) и references/feedback-recipes.md: отклик нажатия, короткий pop числа, затухающее сообщение после сохранения. Эффекты заканчиваются, ввод не блокируют, reduced-motion их отключает. Без тряски и вспышек.
- [roguelike](https://github.com/InM1nd/buzzle/blob/chore/gamedev-agent-skills/.agents/skills/roguelike/SKILL.md): узкий принцип «план → отдельный ход → читаемый результат». Dungeon/FOV/боевые шаблоны здесь не нужны. Движок забега не строился.

## Просмотренные изображения
Все ссылки — официальные изображения Steam, 1920×1080:
- [Зима](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/39991493309246ce1ee9f651a7d1baffd6b20c22/ss_39991493309246ce1ee9f651a7d1baffd6b20c22.1920x1080.jpg?t=1792764752)
- [Лето](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/4a609c426127ebc1917fe6033466419097e2b428/ss_4a609c426127ebc1917fe6033466419097e2b428.1920x1080.jpg?t=1792764752)
- [Большой улей](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/8085375feef14057e9e73a7013ee2c389823f517/ss_8085375feef14057e9e73a7013ee2c389823f517.1920x1080.jpg?t=1792764752)
- [Нападение](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/d1eccb521131a323ff11266124004ba278c20871/ss_d1eccb521131a323ff11266124004ba278c20871.1920x1080.jpg?t=1792764752)
- [Вылазки](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/f343f7f3915d07567367b741805f31f403ab592c/ss_f343f7f3915d07567367b741805f31f403ab592c.1920x1080.jpg?t=1792764752)
- [Поле и инструменты](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4864810/330c27635b7f8acd2396b4f4b961bb4f0963cf36/ss_330c27635b7f8acd2396b4f4b961bb4f0963cf36.1920x1080.jpg?t=1792764752)
