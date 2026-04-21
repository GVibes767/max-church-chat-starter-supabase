# Push backend setup

## Что уже добавлено

- `apps/server/src/index.ts` умеет:
  - хранить push subscriptions
  - отдавать public VAPID key
  - принимать подписки от браузера
  - отправлять тестовые push
  - отправлять push при новом сообщении
- `push-client.js` подключает фронт к backend
- `sw.js` принимает push и показывает уведомления

## Что нужно сделать

1. Сгенерировать VAPID ключи:
   - `npx web-push generate-vapid-keys`
2. Развернуть `apps/server` на Render / Railway / VPS
3. Задать переменные окружения:

```env
PORT=3001
CLIENT_ORIGIN=https://gvibes767.github.io
APP_URL=https://gvibes767.github.io/max-church-chat-starter-supabase/
VAPID_SUBJECT=mailto:you@example.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

4. После деплоя открыть вкладку `Уведомления` на сайте
5. Вставить URL backend
6. Нажать `Включить уведомления`
7. Нажать `Тест уведомления`

## Важно по iPhone

На iPhone сайт нужно открыть в Safari, добавить на главный экран и запускать уже как web app.
