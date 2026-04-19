import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { REGULATION_HTML } from './regulation-content.js';

const URL = 'https://gbtmdwknkepuqbsefhto.supabase.co';
const KEY = localStorage.getItem('gvbs_supabase_key') || prompt('Вставь publishable key Supabase');
if (KEY) localStorage.setItem('gvbs_supabase_key', KEY);

const db = createClient(URL, KEY || '');
const T = 'media_chat_messages';
const B = 'media-chat';
const PROFILE = 'gvbs-pages-profile';
const REG_KEY = 'gvbs-regulation-url';
const NOTIFY = 'gvbs-notify-enabled';
const LAST_SEEN = 'gvbs-last-seen';

const EMOJIS = ['😀','😁','😂','🤣','😊','😍','🥹','😎','🔥','🙏','👏','🙌','❤️','👍','👀','🎤','📸','🎬','✨','🤝','🙋','📖','✝️','🎉','😇','🕊️','💙','✅','❗','🤍'];
const $ = (s) => document.querySelector(s);
const app = $('#app');

const state = {
  profile: loadJson(PROFILE, null),
  msgs: [],
  files: [],
  audio: null,
  rec: null,
  chunks: [],
  tab: 'chat',
  regulationUrl: localStorage.getItem(REG_KEY) || '',
  notificationsEnabled: localStorage.getItem(NOTIFY) === '1',
  emojiOpen: false,
  actionMode: 'mic',
  lastSeenIds: new Set(loadJson(LAST_SEEN, []))
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function esc(t) { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; }
function tm(v) { return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function vib(ms = 16) { try { navigator.vibrate?.(ms); } catch {} }
function avatar(name, url, cls='') { return url ? `<img class='avatar-img ${cls}' src='${url}' alt='avatar'>` : `<span class='avatar-fallback ${cls}'>${esc((name || 'U').slice(0,1).toUpperCase())}</span>`; }
function saveProfile() { saveJson(PROFILE, state.profile); }
function saveReg() { localStorage.setItem(REG_KEY, state.regulationUrl || ''); }
function saveNotify() { localStorage.setItem(NOTIFY, state.notificationsEnabled ? '1' : '0'); }
function updateLastSeen() { saveJson(LAST_SEEN, [...state.lastSeenIds]); }

async function fileToDataUrl(file) {
  return await new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(file); });
}

function notifyMessage(msg) {
  if (!state.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (msg.author_id === state.profile?.id) return;
  if (!document.hidden) return;
  new Notification(`Новое сообщение: ${msg.author_name}`, { body: msg.text || 'Фото / голосовое сообщение', icon: state.profile?.avatar || undefined });
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    alert('На этом устройстве уведомления не поддерживаются браузером.');
    return;
  }
  const p = await Notification.requestPermission();
  state.notificationsEnabled = p === 'granted';
  saveNotify();
  renderShell();
  sub();
  load();
}

function updateActionMode() {
  state.actionMode = ($('#t')?.value.trim() || state.files.length || state.audio) ? 'send' : 'mic';
  const btn = $('#act');
  if (!btn) return;
  btn.textContent = state.actionMode === 'send' ? '➤' : (state.rec ? '⏺' : '🎤');
  btn.classList.toggle('recording', !!state.rec);
}

function renderLogin() {
  app.innerHTML = `<div class='shell login-wrap'><div class='card'><div class='pill'>GVBS MEDIA CHAT</div><h1>Открыть чат</h1><p>Введи имя и, если хочешь, сразу добавь аватарку.</p><input class='input' id='n' placeholder='Например: Сергей монтаж'><input id='a' type='file' accept='image/*' class='hidden'><button class='ghost full' id='ap'>Загрузить аватар</button><div class='avatar-upload' id='avp'></div><button class='primary' id='go'>Войти</button></div></div>`;
  let avatarUrl = '';
  $('#ap').onclick = () => { vib(); $('#a').click(); };
  $('#a').onchange = async () => {
    const f = $('#a').files?.[0];
    if (!f) return;
    avatarUrl = await fileToDataUrl(f);
    $('#avp').innerHTML = `<div class='profile-line'><div class='avatar big'>${avatar('', avatarUrl)}</div><span>Аватар загружен</span></div>`;
  };
  $('#go').onclick = () => {
    vib(20);
    const n = $('#n').value.trim();
    if (!n) return;
    state.profile = { id: crypto.randomUUID(), name: n, avatar: avatarUrl };
    saveProfile();
    boot();
  };
}

function renderShell() {
  const p = state.profile;
  app.innerHTML = `<div class='shell'><div class='layout'><aside class='sidebar'><div class='pill'>MEDIA ROOM</div><h2>Медиа-служение</h2><p>Общая история на всех устройствах через Supabase.</p><div class='section'><div class='section-title'>Профиль</div><div class='profile-line'><div class='avatar'>${avatar(p.name, p.avatar)}</div><div><div class='name-strong'>${esc(p.name)}</div><div class='muted' id='st'>Подключение...</div></div></div></div><div class='section'><div class='section-title'>Навигация</div><button class='nav-btn ${state.tab==='chat'?'active':''}' id='tabChat'>Чат</button><button class='nav-btn ${state.tab==='rules'?'active':''}' id='tabRules'>Регламент</button></div><div class='section'><div class='section-title'>Уведомления</div><button class='nav-btn ${state.notificationsEnabled?'active':''}' id='notifyBtn'>${state.notificationsEnabled?'Уведомления включены':'Включить уведомления'}</button></div></aside><main class='chat'><header class='chat-head'><div><h1>${state.tab==='chat'?'Чат медиа-служения':'Регламент медиа-служения'}</h1><p>${state.tab==='chat'?'Сообщения, фото, эмодзи и голосовые':'Встроенный регламент команды'}</p></div><div class='head-actions'><button class='profile-chip' id='rename'><div class='avatar small'>${avatar(p.name,p.avatar)}</div><span>${esc(p.name)}</span></button></div></header><section class='tab ${state.tab==='chat'?'':'hidden'}' id='chatTab'><div class='messages' id='m'></div><button class='jump hidden' id='down' aria-label='Вниз'>↓</button><div class='composer'><div class='emoji-panel ${state.emojiOpen?'open':''}' id='emojiPanel'>${EMOJIS.map(e=>`<button class='emoji-btn' data-emoji='${e}'>${e}</button>`).join('')}</div><div class='previews' id='p'></div><div class='composer-row'><button class='icon-btn' id='emojiToggle' title='Эмодзи'>😊</button><textarea id='t' placeholder='Сообщение' rows='1'></textarea><input id='f' type='file' accept='image/*' multiple class='hidden'><button class='icon-btn' id='pf' title='Фото'>📎</button><button class='action-btn' id='act' title='Действие'>🎤</button></div><div class='voice-row ${state.rec?'show':''}' id='voiceRow'><div class='voice-status'>Идёт запись…</div><button class='ghost lock ${state.rec?'':'hidden'}' id='lockVoice'>Закрепить</button></div></div></section><section class='tab ${state.tab==='rules'?'':'hidden'} regulation' id='rulesTab'><div class='rules-card'><div class='section-title'>Положение о медиаслужении</div><p class='muted'>Вкладка уже наполнена содержанием документа. Ниже можно при желании добавить публичную PDF-ссылку отдельно.</p><div class='rules-form'><input class='input' id='regUrl' placeholder='Публичная ссылка на PDF (необязательно)' value='${esc(state.regulationUrl)}'><button class='ghost' id='saveReg'>Сохранить ссылку</button></div>${state.regulationUrl?`<a class='ghost full' href='${state.regulationUrl}' target='_blank' rel='noopener noreferrer'>Открыть PDF в новой вкладке</a>`:''}<div class='embedded-rules'>${REGULATION_HTML}</div></div></section></main></div></div>`;
  bind();
  draw();
  updateActionMode();
}

function draw() {
  const c = $('#m');
  if (!c) return;
  c.innerHTML = state.msgs.map(x => `<div class='message ${x.author_id===state.profile.id?'own':''}'><div class='bubble'><div class='meta'><div class='avatar xsmall'>${avatar(x.author_name,'')}</div><strong>${esc(x.author_name)}</strong><span>${tm(x.created_at)}</span>${x.author_id===state.profile.id&&!x.deleted_at?`<button class='small-btn' data-e='${x.id}'>✎</button><button class='small-btn' data-d='${x.id}'>✕</button>`:''}</div>${x.deleted_at?`<div class='deleted'>Сообщение удалено</div>`:`<div class='text'>${esc(x.text||'')}</div>`}${(x.attachments||[]).length?`<div class='media-grid'>${x.attachments.map(a=>a.kind==='audio'?`<audio controls src='${a.url}'></audio>`:`<img src='${a.url}' alt='${esc(a.name||'media')}'>`).join('')}</div>`:''}</div></div>`).join('');
  c.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { vib(); await db.from(T).update({ text:'', deleted_at:new Date().toISOString() }).eq('id', b.dataset.d); });
  c.querySelectorAll('[data-e]').forEach(b => b.onclick = async () => {
    vib();
    const row = state.msgs.find(x => x.id === b.dataset.e);
    if (!row) return;
    const next = prompt('Редактировать сообщение', row.text || '');
    if (next == null) return;
    await db.from(T).update({ text: next }).eq('id', row.id);
  });
  setTimeout(() => c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }), 40);
}

function previews() {
  const p = $('#p');
  if (!p) return;
  const bits = [...state.files.map(f => `<span class='preview-chip'>${esc(f.name)}</span>`), state.audio ? `<span class='preview-chip danger-chip'>Голосовое готово</span>` : ''];
  p.innerHTML = bits.filter(Boolean).join('');
  updateActionMode();
}

function grow() {
  const t = $('#t');
  if (!t) return;
  t.style.height = '0px';
  t.style.height = Math.min(t.scrollHeight, 170) + 'px';
  updateActionMode();
}

async function up() {
  const out = [];
  for (const f of state.files) {
    const path = `${Date.now()}-${crypto.randomUUID()}-${f.name}`;
    const r = await db.storage.from(B).upload(path, f, { upsert:false, cacheControl:'3600' });
    if (r.error) throw r.error;
    out.push({ kind:'image', name:f.name, url:db.storage.from(B).getPublicUrl(path).data.publicUrl });
  }
  if (state.audio) {
    const f = new File([state.audio], `voice-${Date.now()}.webm`, { type: state.audio.type || 'audio/webm' });
    const path = `${Date.now()}-${crypto.randomUUID()}-${f.name}`;
    const r = await db.storage.from(B).upload(path, f, { upsert:false, cacheControl:'3600' });
    if (r.error) throw r.error;
    out.push({ kind:'audio', name:f.name, url:db.storage.from(B).getPublicUrl(path).data.publicUrl });
  }
  return out;
}

async function send() {
  const t = $('#t');
  const text = t.value.trim();
  if (!text && !state.files.length && !state.audio) return;
  try {
    const attachments = await up();
    const r = await db.from(T).insert({ author_id:state.profile.id, author_name:state.profile.name, text, attachments });
    if (r.error) throw r.error;
    vib(28);
    state.files = [];
    state.audio = null;
    t.value = '';
    grow();
    previews();
  } catch (e) {
    alert('Проверь SQL-настройку Supabase и bucket media-chat');
    console.error(e);
  }
}

async function load() {
  const prev = new Set(state.msgs.map(x => x.id));
  const r = await db.from(T).select('*').order('created_at', { ascending:true });
  const st = $('#st');
  if (r.error) {
    if (st) st.textContent = 'Нужно проверить SQL / Realtime';
    console.error(r.error);
    return;
  }
  if (st) st.textContent = 'Подключено к общей базе';
  state.msgs = r.data || [];
  for (const msg of state.msgs) {
    if (!prev.has(msg.id) && !state.lastSeenIds.has(msg.id)) {
      state.lastSeenIds.add(msg.id);
      notifyMessage(msg);
      if (msg.author_id !== state.profile?.id) vib(60);
    }
  }
  updateLastSeen();
  draw();
}

function sub() {
  db.channel('media-chat-room').on('postgres_changes', { event:'*', schema:'public', table:T }, () => load()).subscribe();
}

async function rec(btn) {
  if (state.rec) {
    state.rec.stop();
    state.rec = null;
    btn.classList.remove('recording');
    $('#voiceRow')?.classList.remove('show');
    updateActionMode();
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
  state.chunks = [];
  const r = new MediaRecorder(stream);
  r.ondataavailable = e => state.chunks.push(e.data);
  r.onstop = () => {
    state.audio = new Blob(state.chunks, { type:'audio/webm' });
    stream.getTracks().forEach(t => t.stop());
    previews();
  };
  r.start();
  state.rec = r;
  btn.classList.add('recording');
  $('#voiceRow')?.classList.add('show');
  vib(24);
  updateActionMode();
}

function insertEmoji(emoji) {
  const t = $('#t');
  if (!t) return;
  const start = t.selectionStart || t.value.length;
  const end = t.selectionEnd || t.value.length;
  t.value = t.value.slice(0, start) + emoji + t.value.slice(end);
  t.focus();
  t.selectionStart = t.selectionEnd = start + emoji.length;
  grow();
}

function bind() {
  $('#tabChat').onclick = () => { vib(); state.tab = 'chat'; renderShell(); sub(); load(); };
  $('#tabRules').onclick = () => { vib(); state.tab = 'rules'; renderShell(); sub(); };
  $('#notifyBtn').onclick = () => { vib(); enableNotifications(); };
  $('#rename').onclick = async () => {
    vib();
    const n = prompt('Новое имя участника', state.profile.name || '');
    if (!n || !n.trim()) return;
    state.profile.name = n.trim();
    const change = confirm('Обновить аватар?');
    if (change) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files?.[0];
        if (f) { state.profile.avatar = await fileToDataUrl(f); saveProfile(); renderShell(); sub(); load(); }
      };
      inp.click();
    }
    saveProfile(); renderShell(); sub(); load();
  };
  $('#emojiToggle')?.addEventListener('click', () => { vib(); state.emojiOpen = !state.emojiOpen; $('#emojiPanel').classList.toggle('open', state.emojiOpen); });
  $('#emojiPanel')?.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => { vib(10); insertEmoji(b.dataset.emoji); }));
  $('#pf')?.addEventListener('click', () => { vib(); $('#f').click(); });
  $('#f')?.addEventListener('change', () => { state.files = [...$('#f').files]; previews(); vib(); });
  $('#act')?.addEventListener('click', (e) => { vib(); state.actionMode === 'send' ? send() : rec(e.currentTarget); });
  $('#lockVoice')?.addEventListener('click', () => { vib(); if (state.rec) { state.rec.stop(); state.rec = null; $('#voiceRow').classList.remove('show'); updateActionMode(); } });
  $('#t')?.addEventListener('input', grow);
  $('#t')?.addEventListener('focus', () => vib(8));
  $('#t')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  $('#down')?.addEventListener('click', () => { vib(); $('#m').scrollTo({ top: $('#m').scrollHeight, behavior:'smooth' }); });
  $('#m')?.addEventListener('scroll', () => $('#down').classList.toggle('hidden', $('#m').scrollHeight - $('#m').scrollTop - $('#m').clientHeight <= 180));
  $('#saveReg')?.addEventListener('click', () => { vib(); state.regulationUrl = $('#regUrl').value.trim(); saveReg(); renderShell(); sub(); if (state.tab === 'chat') load(); });
  grow();
}

function boot() { renderShell(); sub(); load(); }
state.profile ? boot() : renderLogin();
