# CODEX BRIEF — GVBS Media Hub

## Project

Repository: `GVibes767/max-church-chat-starter-supabase`

Production site:
`https://gvibes767.github.io/max-church-chat-starter-supabase/`

Push backend:
`https://max-church-chat-starter-supabase.onrender.com`

Supabase project URL:
`https://gbtmdwknkepuqbsefhto.supabase.co`

Current purpose: internal mobile-first chat/PWA for the media ministry team of the church “Ковчег спасения”, Omsk.

Target product name: **GVBS Media Hub**

Goal: turn the current starter chat into a polished, reliable, modern Telegram-like team communication web app with chat, photos, voice messages, PDF regulation download, push notifications, reactions, profile, files, and production-ready architecture.

---

## Important security rule

Do not commit private server secrets.

Allowed in frontend:
- Supabase publishable key
- public backend URL

Never commit:
- Supabase database password
- Supabase service role key
- VAPID private key
- Render secrets

---

## Current frontend files

Important files:

- `index.html` — app entry
- `final-app.js` — current main frontend logic
- `final-styles.css` — base app styles
- `premium-light.css` — lighter premium visual override
- `hardening.js` — extra PDF/download and hardening layer
- `ui-nav.js` — bottom nav enhancement
- `reactions.js` — local reactions overlay
- `site-config.js` — frontend config
- `notify-bridge.js` — bridge from Supabase messages to push backend
- `sw.js` — service worker for push
- `manifest.webmanifest` — PWA manifest

Backend:

- `apps/server/src/index.ts` — Express push backend
- `apps/server/package.json`
- `apps/server/.env.example`

---

## Current problems to fix

### 1. Frontend architecture is patchy

There are too many overlay files:
- `hardening.js`
- `ui-nav.js`
- `premium-light.css`
- `reactions.js`
- `final-app.js`

Task: consolidate into a clean architecture.

Recommended structure:

```text
src/
  app.js
  config.js
  supabase.js
  push.js
  pdf.js
  state.js
  ui/
    render.js
    chat.js
    composer.js
    notifications.js
    files.js
    profile.js
    reactions.js
  styles/
    base.css
    layout.css
    chat.css
    mobile.css
    premium.css
```

If build tooling is not used, keep vanilla JS but split cleanly.

---

### 2. Design should be premium and not too dark

Current UI is too dark in some versions. Use a premium light-navy theme:

- background: soft blue/white gradient
- panels: white glass cards
- primary accent: blue
- secondary accent: gold
- text: deep navy
- messages: compact, Telegram-like
- own messages: premium blue gradient
- other messages: clean white cards
- composer pinned at the bottom
- mobile bottom navigation

Required sections:

- Chat
- Files
- Regulation
- Notifications
- Profile

---

### 3. Chat behavior

Must work like a real messenger:

- message list scrolls independently
- header and composer stay fixed
- composer always visible at the bottom
- textarea grows up to 5–6 lines
- empty input shows mic button
- text/photo/audio ready shows send button
- Enter sends on desktop
- Shift+Enter adds new line
- button down appears only when user is away from bottom
- do not force-scroll user down when reading old messages
- show “new messages” badge if new messages arrive while user is scrolled up

---

### 4. Messages

Support:

- text
- photos
- voice messages
- edit own message
- delete own message
- compact grouped design
- timestamp
- author name
- author avatar
- author role

Add later:

- reply to message
- pinned messages
- search
- message status

---

### 5. Reactions

Current `reactions.js` stores reactions only in `localStorage`. This is only a visual mock.

Implement real shared reactions in Supabase.

Create table:

```sql
create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  user_id text not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);
```

Frontend behavior:

- reactions visible to all users
- one reaction per user per message
- clicking same reaction removes it
- clicking another reaction replaces previous
- allowed reactions: 👍 👎 ❤️ 🙏 🔥 👀

---

### 6. Files and regulation

Current PDF is generated in browser. This is not ideal.

Target:

- store real PDF in repo or Supabase Storage
- app shows document card
- buttons:
  - Download PDF
  - Open PDF
- no long text reading inside the app

Path suggestion:

```text
files/polozhenie-o-mediasluzhenii.pdf
```

UI card:

- title: Положение о медиаслужении
- subtitle: Церковь «Ковчег спасения», г. Омск
- version/date
- file size
- PDF icon

---

### 7. Push notifications

Current architecture uses browser bridge.

Target production architecture:

```text
User sends message
  ↓
Message saved in Supabase
  ↓
Supabase Database Webhook calls Render backend
  ↓
Backend loads push subscriptions from Supabase
  ↓
Backend sends push to all users except author
  ↓
Service worker shows notification
```

Backend endpoint to add:

```text
POST /api/webhooks/supabase-message
```

Notification format:

```text
Медиаслужение
Андрей: Завтра в 17:30 сбор по свету
```

For photo:

```text
Медиаслужение
Андрей отправил фото
```

For voice:

```text
Медиаслужение
Андрей отправил голосовое сообщение
```

Click opens the chat URL.

---

### 8. Push subscription storage

Current backend stores subscriptions in JSON file. Replace with Supabase table.

SQL:

```sql
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Backend must:

- save subscriptions to Supabase
- delete subscription on unsubscribe
- delete expired subscriptions on 404/410 push errors
- never store secrets in frontend

---

### 9. Notifications UI

Make a clear diagnostics screen.

Show:

- HTTPS: yes/no
- Browser Notification permission: granted/default/denied
- Service Worker: active/not active
- Push API: available/not available
- Backend: online/offline
- Push subscription: active/not active

Button logic:

- if inactive: `Включить уведомления`
- if active: `Отключить уведомления`
- test button: `Тест уведомления`

Important iPhone instruction:

- open in Safari
- Share
- Add to Home Screen
- launch from icon
- enable notifications

Android:

- use Chrome
- allow notifications

---

### 10. Profiles and access

Add simple profile model:

```sql
create table if not exists profiles (
  id text primary key,
  name text not null,
  avatar_url text,
  role text default 'Участник',
  created_at timestamptz default now()
);
```

Roles:

- Руководитель
- Координатор
- Оператор
- Фотограф
- Монтажёр
- Звук
- Свет
- Дизайн
- Публикатор
- Участник

Add simple access code before login.

Do not expose admin tools to everyone.

---

### 11. Upload limits

Frontend and backend should enforce:

- photo only: `image/*`
- max photo size: 10 MB
- max 6 photos per message
- voice max duration: 5 minutes
- text max length: 3000 chars
- rate limit: basic client-side and server-side if possible

---

### 12. PWA

Improve PWA:

- proper icons 192 and 512
- standalone display
- theme color matching premium light-navy theme
- offline shell
- service worker versioning
- notification click opens app

---

## Recommended implementation order

### Phase 1 — clean frontend

- consolidate UI code
- remove overlay chaos
- keep vanilla JS if necessary
- premium light-navy design
- bottom mobile navigation
- pinned composer
- files/regulation/profile tabs

### Phase 2 — data model

- add `profiles`
- add `message_reactions`
- add `push_subscriptions`
- optionally add `documents`
- migrate local reactions to Supabase

### Phase 3 — push production

- backend uses Supabase for subscriptions
- Supabase webhook calls backend
- remove browser bridge dependency
- add diagnostics UI

### Phase 4 — polish

- search
- pinned messages
- reply
- real shared reactions
- lightbox images
- voice waveform/timer
- install prompt

---

## Acceptance checklist

The app is ready when:

- opens without prompts for keys
- no manual backend URL input
- chat history persists
- messages appear across devices
- photos upload
- voice messages upload
- composer is always pinned
- bottom nav works on mobile
- PDF downloads correctly
- notifications enable once and stay enabled
- test push works
- new message push works on Android Chrome
- iPhone instructions are visible
- reactions sync between users
- no broken tabs
- no old dark-only design
- no local-only reaction state
- no JSON-file push storage

---

## Main direction

Do not keep layering patches forever. Refactor toward a clean, maintainable, production-ready app.

Target: **GVBS Media Hub** — premium, mobile-first, Telegram-like working space for the media ministry.
