# Dev APK: выбранные пять стилей глифов

Собрать последний коммит ветки **v1.6** репозитория InM1nd/buzzle. Не менять main, не сливать PR, не публиковать стабильный релиз и не деплоить GitHub Pages.

## Изменения

Актуальный выбор владельца: №1,3,4,5,7. Настройки → Соты головоломки содержат пять пунктов:

- «Яркие (1.5)» (`classic`).
- «Матовая пастель» (`pastel`).
- «Тёплый воск» (`wax`).
- «Медовый · мягче» (`balanced`, v2).
- «Яркие · спокойнее» (`mellow`, v4), включая дорисованный Halloween (`hmellow`).

Все пять доступны и в DEV, и в обычном выборе. «DEV · Хеллоуин» переключает сезонные изображения. №2 «Мягкий кристалл» и №6 «Медовый · грани» оставлены только в библиотеке. Сохранённый выбор `soft` переводится в `mellow`, `faceted` — в `balanced`; другие настройки и прогресс не меняются. Новый default — `mellow`. Версия схемы сохранений и экономика не менялись. Названия переведены на en/uk/ru.

Новые16 WebP240×208: `assets/art/tiles/{mellow,hmellow}_*.webp`, quality94. Прозрачные поля нормализованы: глифы занимают ту же клетку, что остальные стили, бомбы компактные и целые. Прежние31 WebP `soft/hsoft/faceted/hfaceted` перенесены в `design/art/glyph-library-only-v1/runtime/` и не попадают в бандл. Полное решение — `design/art/GLYPH_BUILD_SELECTION.ru.md`. Для сборки повторно импортировать изображения не нужно; все runtime-файлы уже готовы.

## Сборка

Использовать среду, настройки и прежний ключ подписи уже опубликованного Buzzle Dev из v1.5.5-dev. Новый ключ не создавать. Ожидаемый SHA256 сертификата:

`79:0C:F7:3C:A6:6C:F9:7B:E3:A1:0C:27:0E:79:6F:1C:9D:6C:67:57:A2:39:F5:72:3B:6E:97:AE:E1:37:7B:DC`

Параметры **финального APK**: applicationId `com.zabolotny.bzz.dev`, имя `Buzzle Dev`, versionName `1.5.5-dev`, versionCode **23**. Устанавливается поверх предыдущего Dev с сохранением его прогресса, рядом со стабильным приложением. Нативные библиотеки Stored/16KB-aligned, arm64, release-подпись как прежде. Апдейтер выключен.

```bash
git switch v1.6
git pull --ff-only origin v1.6
npm ci
export EXPO_PUBLIC_BZZ_DEV=1
export EXPO_PUBLIC_BZZ_UPDATER=off
export BZZ_UPDATER=off
CI=1 npx expo prebuild --platform android --no-install
bash scripts/configure-android.sh
npm run typecheck
npm test
npm run test:ui -- --runInBand
```

После этих проверок применить тот же side-by-side dev profile, что использовался для предыдущего APK: applicationId и label Dev, versionName с суффиксом-dev. В исходном app.json указан стабильный applicationId, одной переменной EXPO_PUBLIC_BZZ_DEV недостаточно для его изменения! versionCode23 уже выставлен и в app.json, и в src/version.ts. Проверить фактические параметры через aapt/apksigner после сборки; не загружать APK обычного package, unsigned/debug или с чужим сертификатом.

```bash
cd android
./gradlew assembleRelease --no-daemon --console=plain
cd ..
cp android/app/build/outputs/apk/release/app-release.apk Buzzle-dev.apk
bash scripts/verify-apk.sh Buzzle-dev.apk
test "$(gh release view v1.5.5-dev --repo InM1nd/buzzle --json isPrerelease --jq .isPrerelease)" = "true"
gh release upload v1.5.5-dev Buzzle-dev.apk --repo InM1nd/buzzle --clobber
```

Обновить описание существующего prerelease точным commit SHA, versionCode23 и выполненными проверками. Тег не перемещать. Стабильный v1.5.0 и его APK не трогать.

## Что проверить на устройстве

Оба новых стиля видны в настройках; выбор переживает закрытие приложения. DEV·Хеллоуин меняет превью и игровое поле, включая бомбу, джокера и тыкву; отключение возвращает обычные рисунки. Сохранения, валюты и прогресс остаются. Проверить две новые темы на 360/390 и на настоящем Android, качество спрайтов и поля бомбы.

На стороне Codex проверены TypeScript,124 игровых теста,38 UI-тестов и web-export с dev-флагом; сохранены скриншоты четырёх сочетаний в ширинах360/390. Native prebuild выполнен для сверки версии, но APK **не собран**: на Mac отсутствуют Android SDK/Java runtime и прежний signing key. Проверка подписи/размера/установки ожидает Android-сборки. Не выдавать старый APK за обновлённый.
