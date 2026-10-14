# Grok: собрать обновлённый dev APK

Репозиторий `InM1nd/buzzle`, рабочая ветка **v1.5-ui**. Последние UI-исправления и растровые слои пчёл уже в этой ветке. `main` не менять, PR не сливать, force push не использовать.

## Сборка

Использовать среду Android-сборки 1.4.1 и **тот же** `keystore/bzz-release.jks` и `keystore/keystore.properties`. Не создавать другой ключ и не добавлять ключи/пароли в Git. Ожидаемый SHA-256 сертификата:

`79:0C:F7:3C:A6:6C:F9:7B:E3:A1:0C:27:0E:79:6F:1C:9D:6C:67:57:A2:39:F5:72:3B:6E:97:AE:E1:37:7B:DC`

```bash
git switch v1.5-ui
git pull --ff-only origin v1.5-ui
npm ci
npm run typecheck
npm test
npm run test:ui -- --runInBand
CI=1 npx expo prebuild --platform android --no-install
bash scripts/configure-android.sh
cd android
./gradlew assembleRelease --no-daemon --console=plain
cd ..
cp android/app/build/outputs/apk/release/app-release.apk Buzzle-v1.5.0-dev.apk
bash scripts/verify-apk.sh Buzzle-v1.5.0-dev.apk
```

Параметры уже выставлены: `versionName=1.5.0-dev`, `versionCode=16`, `applicationId=com.zabolotny.bzz`, arm64, R8/resource shrinking, `expo.useLegacyPackaging=false`. После prebuild обязательно выполнить configure-android.sh: он подключает прежний release signing и настройки упаковки.

## До загрузки

- Проверить фактический package/version через aapt и сертификат через apksigner, а не только конфигурацию проекта. Не загружать debug/unsigned APK или APK с другим сертификатом.
- Нативные `.so` должны быть Stored/несжатыми и выровненными как у 1.4.1; проверить zipalign и ELF alignment.
- Измерить размер APK: цель ≤25 МБ, без понижения качества пчёл. Если размер больше — найти вклад библиотек/ресурсов и описать результат. Не уменьшать новые портреты и лётные слои вслепую.
- По возможности установить поверх 1.4.1 с тестовым прогрессом и проверить сохранение прогресса, шрифты, WebP, крылья/наряды, поля ввода и аппаратную кнопку назад. Не менять логику, экономику и миграции ради сборки.
- [UI-отчёт](V15_UI_REVIEW.ru.md): 94 игровых +31 UI-тест прошли; браузерная проверка — [скриншоты и сравнения](../screens/v1.5-review/README.md). Нативная сборка на стороне Codex не выполнена из-за отсутствия среды и ключа.

## Публикация

Обновить **только существующий prerelease v1.5.0-dev**, заменить старый APK. Обычный релиз не создавать, prerelease в стабильный не переводить. Основной апдейтер не должен предлагать этот dev APK. GitHub Pages в рамках этой задачи не деплоить.

```bash
test "$(gh release view v1.5.0-dev --repo InM1nd/buzzle --json isPrerelease --jq .isPrerelease)" = "true" || exit 1
gh release upload v1.5.0-dev Buzzle-v1.5.0-dev.apk --repo InM1nd/buzzle --clobber
```

В описании prerelease отметить точный commit сборки и выполненные проверки. Вернуть владельцу ссылку на APK, размер файла, versionCode и результат проверки подписи. Если ключ/среда недоступны, сообщить об этом; другим ключом не подменять.
