# Детект VALORANT: проверка внешних источников

Дата проверки: 13 октября 2026. Это исследование документации и исходных спецификаций. Живой матч, выданные приложению разрешения Riot/Overwolf и работа конкретного браузера не проверялись. Код приложения не изменён.

## Что удалось установить

Публичного официального способа получить запуск клиента, очередь, выбор агента и активный матч только по логину Riot не найдено. Документированные VALORANT API содержат историю матчей, сведения о завершённых играх, контент, рейтинговую таблицу и состояние платформы. Последнее означает доступность сервиса Riot, а не запуск игры у пользователя. RSO даёт безопасную авторизацию; наличие RSO само по себе не добавляет отсутствующий live API. Это вывод из опубликованного каталога, а не утверждение о внутренних возможностях Riot. [Riot: VALORANT API и RSO](https://developer.riotgames.com/docs/valorant), [Riot: RSO FAQ](https://developer.riotgames.com/docs/faqs).

Рабочие пути без скачивания есть, но с другим компромиссом: ручной выбор карты/фазы; предоставление браузеру доступа к папке логов; либо захват экрана. Последние два требуют явного взаимодействия пользователя и экспериментальной проверки надёжности. Они не равны полностью автоматическому детекту процесса.

## Официальный API: история без установки

Riot перечисляет `VAL-MATCH-V1`: получение матча по ID, списка игр по PUUID и недавних матчей по очереди. Production key и одобрение RSO нужны для поддерживаемого доступа к данным игрока; personal applications для VALORANT не поддерживаются. Игрок должен согласиться на передачу данных. Продукт для игроков подлежит регистрации даже без официального API. Политика исключает scouting соперников перед матчем и real-time подсказки, непосредственно меняющие поведение в игре. Эти ограничения важны для финального сценария picker, но по одной документации нельзя вынести решение об одобрении конкретного приложения. [Riot policy](https://developer.riotgames.com/docs/valorant).

Практический вывод: RSO + backend хорошо подходят для загрузки истории после игры, но не заменяют источник pregame. Нельзя выдавать «матч найден в истории» за мгновенный сигнал окончания: гарантия времени появления результата в прочитанных документах не указана. [Официальное объяснение назначения API](https://www.riotgames.com/en/DevRel/valorant-api-launch).

## Внутренние клиентские API: подробный live, без гарантии поддержки

Оригинальная community документация прямо маркирует endpoints как unofficial и официально не поддерживаемые. Её заверение про отсутствие банов не является гарантией Riot. [Проект techchrism](https://valapidocs.techchrism.me/), [исходники генератора и типов](https://github.com/techchrism/valorant-api-docs).

- Локальный WebSocket поддерживает подписку на именованные события. Порт и пароль берутся из `%LocalAppData%\Riot Games\Riot Client\Config\lockfile`; подключение использует Basic authentication. [Local WebSocket](https://valapidocs.techchrism.me/endpoint/local-websocket).
- Локальный `/entitlements/v1/token` возвращает игровой access token и entitlement. Это чувствительные credentials; для архитектуры предпочтительно сохранять их локально, передавая сайту только нормализованный статус. [Entitlements Token](https://valapidocs.techchrism.me/endpoint/entitlements-token).
- `pregame/v1/players/{puuid}` определяет pregame match ID; `pregame/v1/matches/{id}` содержит карту, очередь, состояние character select и выбор/lock агента. [Pre-Game Player](https://valapidocs.techchrism.me/endpoint/pre-game-player), [Pre-Game Match](https://valapidocs.techchrism.me/endpoint/pre-game-match).
- `core-game/v1/players/{puuid}` определяет текущий match ID; соответствующий match endpoint возвращает сведения о текущем матче. [Current Game Player](https://valapidocs.techchrism.me/endpoint/current-game-player), [Current Game Match](https://valapidocs.techchrism.me/endpoint/current-game-match).
- Party endpoint содержит участников, состояние, очередь и время входа в неё. [Party](https://valapidocs.techchrism.me/endpoint/party).

Инженерный вывод: маленький native helper может читать lockfile, поддерживать локальный WebSocket, восстанавливать snapshot после reconnect и использовать редкий polling для сверки. Это лучше по полноте сигнала, чем определять состояние только по последним строкам лога, но поддерживаемость протокола нужно измерять на текущем клиенте. Сетевой сбой/401/403 не доказывает, что игрок вышел из игры.

Не следует продавать удалённый login в недокументированные игровые endpoints как устойчивое «без установки»: у проекта документации остаётся открытая заявка о переставшем работать Auth Cookies. Это сообщение пользователя, а не доказательство отказа всех auth flows, но оснований считать этот путь стабильнее официального RSO нет. [Issue #65](https://github.com/techchrism/valorant-api-docs/issues/65).

## Overwolf: документированный live SDK, установка остаётся

GEP документирует `scene=CharacterSelectPersistentLevel`, состояния `WaitingToStart`, `InProgress`, `LeavingMap`, `Aborted`, `Init`, карту, match ID и события начала/конца игры. Карта приходит перед `match_start`. `match_end` не работает в custom matches и training; `pseudo_match_id` является ID Overwolf, отдельно от Riot match ID. Эти исключения нужно учитывать в конечном автомате, а не считать отсутствие одного события поломкой пользователя. [VALORANT game events](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/valorant/).

Более удобный по упаковке вариант — **ow-electron**: отдельное desktop приложение с игровыми событиями, без отдельного Overwolf Native client. Документация говорит о включении игр отдельно для приложения, поэтому доступ к VALORANT нужно подтвердить с Overwolf. Пользователь всё равно получает и запускает desktop программу; «standalone» не означает browser-only. Собственная подпись приложения рекомендована; часть возможностей ow-electron ещё меняется. [Сравнение Native и Electron](https://dev.overwolf.com/ow-electron/getting-started/onboarding-resources/frameworks-overview/).

Overwolf имеет health status API с состояниями unsupported/green/yellow/red; обновление статуса может отставать примерно на 10 минут. Удобно показывать причину временной недоступности вместо «VALORANT закрыт». SLA без сбоев источники не обещают, текущий health конкретной игры в исследовании не проверялся. [Проверка событий для приложения](https://dev.overwolf.com/ow-native/live-game-data-gep/verifying-events-for-your-app/).

## Что изменилось в браузерах

Chrome внедрил Local Network Access permission начиная с 142; этот подход заменил прежний Private Network Access. Это разрешение на сетевое соединение с локальным адресом, а не на чтение lockfile или процессов. [Chrome LNA](https://developer.chrome.com/blog/local-network-access).

Более свежие Google release notes указывают split разрешений в 145: `local-network` и `loopback-network`; расширение LNA на WebSocket/WebTransport — 147. В старых частях тех же notes фигурирует план 146; при реализации опираться на текущий браузер и тестировать поведение, не на устаревший план. [Google release notes](https://support.google.com/chrome/a/answer/10314655?hl=en).

Стандартный CORS остаётся отдельной проверкой чтения cross-origin ответа. Разрешение localhost не решает credentials и сертификат локального Riot API. Поэтому прямой браузерный доступ к Riot Client не следует считать готовой заменой helper без прототипа. [GoogleChrome: LNA guidance](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/security/local-network-access.md).

Расширение браузера тоже не является автоматическим устранением native части: штатный Native Messaging связывает extension с установленным native host. [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [Microsoft: модели распространения host](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging).

## Реальный эксперимент без скачивания: пользователь выбирает папку логов

`showDirectoryPicker()` позволяет получить доступ к выбранной пользователем папке. Chromium поддерживает File System Access, нужны secure context и user gesture. File/directory handles можно хранить в IndexedDB, но разрешения между сессиями сохраняются не всегда; изменённый файл необходимо перечитать через новый `getFile()`. Это позволяет исследовать чтение `ShooterGame.log` прямо в браузере. Доступ желательно read-only. [Chrome: File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access).

Расположение VALORANT лога подтверждено оригинальной документацией API. Однако она не обещает, что лог является стабильным полноценным feed всех фаз. [Investigating Endpoints](https://valapidocs.techchrism.me/#investigating-endpoints).

**Гипотеза для прототипа:** после выбора папки сайт читает только новые байты, при усечении/ротации снова получает файл из directory handle, сбрасывает состояние сессии и восстанавливает фазу. Необходимо проверить реальные логи новой версии: старт, очередь, отмена очереди, выбор агентов, dodge, загрузка, матч, завершение, crash/restart. Это отдельный режим с потенциально неполными данными, не обещание надёжного детекта процесса.

Критическое ограничение: браузер может throttling timers в скрытой вкладке, а frozen/discarded страницы вообще не выполняют задачи. Web Worker/PWA сами по себе не гарантируют постоянную работу, пока пользователь играет. Нужно измерить задержку с минимизированным браузером и корректно показывать свежесть наблюдения. [Chrome: timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88), [Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).

## Другой эксперимент без установки: screen capture + распознавание

`getDisplayMedia()` предоставляет выбранный пользователем экран/окно. Спецификация требует выбора источника и не позволяет persist granted permission для обычного screen capture. Поэтому запуск каждой новой capture-сессии требует взаимодействия; сайт не может незаметно сам подключаться к окну игры. [W3C Screen Capture](https://www.w3.org/TR/screen-capture/).

Распознавать карту/экран выбора агента локально в браузере технически можно исследовать, но это наш вывод, а не документированная интеграция VALORANT. Нужно проверить fullscreen/borderless, минимизацию, разрешения экрана, язык UI, изменение дизайна, чёрные кадры, CPU и отключение capture. Оно не даёт достоверного process status, party или match ID. Для основной автоматики подходит хуже структурированных событий; для добровольного no-download режима может оказаться приемлемым после измерений.

## Предварительное решение

1. **Основной сценарий без установки:** ручной выбор карты/фазы; для истории — официальный RSO/API при одобрении Riot. Сайт остаётся полезным, когда автоматика недоступна.
2. **Первая no-download проверка:** браузерный reader выбранной папки логов. Сделать ограниченный прототип и тест фона/ротации; успех заранее не гарантируется.
3. **Для устойчивой live автоматики:** optional подписанный helper с WebSocket + восстановлением snapshot + дополнительными сигналами; оценить ow-electron/GEP как альтернативу собственной поддержке Riot protocol.
4. **Требуемая модель статуса:** отдельно доступность источника, процесс/клиент, фаза, карта, match ID, время последнего наблюдения, достоверность. Не превращать молчание лога или network error в offline. Конкретные локальные причины сбоев приведены в аудите приложения, который выполняется отдельно.

Дальнейшие рекомендации — инженерные выводы из прочитанных источников. Надёжность следует считать подтверждённой только после матчей на текущем VALORANT и актуальных Chrome/Edge, включая restart, reconnect, custom/range и работу сайта на опубликованном домене.
