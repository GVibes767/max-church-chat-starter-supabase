import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const cfg = window.GVBS_CONFIG || {};
const SUPABASE_URL = cfg.supabaseUrl || 'https://gbtmdwknkepuqbsefhto.supabase.co';
const SUPABASE_KEY = cfg.supabasePublishableKey || localStorage.getItem('gvbs_supabase_key');
const BACKEND_URL = cfg.pushBackendUrl || 'https://max-church-chat-starter-supabase.onrender.com';
const PROFILE_KEY = 'gvbs-pages-profile';
const SENT_KEY = 'gvbs-push-broadcasted-message-ids';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function rememberSent(id) {
  const ids = new Set(readJson(SENT_KEY, []));
  ids.add(id);
  localStorage.setItem(SENT_KEY, JSON.stringify([...ids].slice(-200)));
}

function wasSent(id) {
  return new Set(readJson(SENT_KEY, [])).has(id);
}

async function broadcastPush(message) {
  const profile = readJson(PROFILE_KEY, null);
  if (!profile?.id || !message?.id) return;
  if (message.author_id !== profile.id) return;
  if (wasSent(message.id)) return;
  rememberSent(message.id);

  const hasText = String(message.text || '').trim();
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const fallback = attachments.some((a) => a.kind === 'audio') ? 'Голосовое сообщение' : attachments.length ? 'Фото' : 'Новое сообщение';

  const form = new FormData();
  form.append('authorId', message.author_id);
  form.append('authorName', message.author_name || profile.name || 'Участник');
  form.append('text', hasText || fallback);

  try {
    await fetch(`${BACKEND_URL}/api/messages`, { method: 'POST', body: form, mode: 'cors' });
  } catch (error) {
    console.warn('Push broadcast failed', error);
  }
}

if (SUPABASE_KEY) {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  db.channel('gvbs-push-broadcast-bridge')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_chat_messages' }, (payload) => broadcastPush(payload.new))
    .subscribe();
}
