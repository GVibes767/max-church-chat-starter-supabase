# GVBS Media Chat Starter

Полностью собранный MVP внутреннего чата для медиа-служения церкви.

## Что уже работает

- текстовые сообщения
- фото и GIF
- голосовые сообщения через микрофон
- мгновенная отправка через Socket.IO
- кнопка перехода к последнему сообщению
- авторасширяющееся поле ввода как в Telegram
- удаление своих сообщений
- индикатор печати
- список онлайн-участников
- премиальный тёмный интерфейс

## Стек

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + Socket.IO
- Upload: local uploads через Multer
- Хранение сообщений: JSON store для быстрого MVP

## Быстрый запуск

```bash
npm install
npm run dev:server
npm run dev:web
```

Frontend откроется на `http://localhost:5173`, backend на `http://localhost:3001`.

## Дальше можно усилить

- авторизация через MAX mini app bridge
- хранение сообщений в PostgreSQL
- загрузка файлов в Supabase Storage или S3
- отдельные комнаты и роли
- push-уведомления
- reply / pinned messages
