const storageKey = 'gvbs-pages-chat-v1';
const profileKey = 'gvbs-pages-profile';

const state = {
  profile: JSON.parse(localStorage.getItem(profileKey) || 'null'),
  messages: JSON.parse(localStorage.getItem(storageKey) || 'null') || [
    {
      id: crypto.randomUUID(),
      authorId: 'system',
      authorName: 'Media Bot',
      text: 'Добро пожаловать в рабочий чат медиа-служения. Здесь уже можно общаться, отправлять фото, GIF и голосовые.',
      attachments: [],
      createdAt: new Date().toISOString()
    }
  ],
  files: [],
  audioBlob: null,
  recording: false,
  recorder: null,
  chunks: [],
  typingName: ''
};

const app = document.getElementById('app');

function saveMessages() {
  localStorage.setItem(storageKey, JSON.stringify(state.messages));
}

function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify(state.profile));
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const list = document.querySelector('.messages');
  if (!list) return;
  list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
}

function renderLogin() {
  app.innerHTML = `
    <div class="shell login-wrap">
      <div class="card">
        <div class="pill">GVBS MEDIA CHAT</div>
        <h1>Открыть приложение</h1>
        <p>Это GitHub Pages-версия интерфейса. Она уже открывает само приложение и подходит для просмотра, теста UX и локальной работы в браузере.</p>
        <input class="input" id="nameInput" placeholder="Например: Сергей монтаж" />
        <button class="primary" id="loginBtn">Войти в чат</button>
        <div class="note">Для общего realtime между разными людьми позже подключим отдельный backend.</div>
      </div>
    </div>
  `;
  document.getElementById('loginBtn').onclick = () => {
    const value = document.getElementById('nameInput').value.trim();
    if (!value) return;
    state.profile = { id: crypto.randomUUID(), name: value };
    saveProfile();
    renderApp();
  };
}

function renderApp() {
  const currentName = state.profile?.name || 'Участник';
  app.innerHTML = `
    <div class="shell">
      <div class="layout">
        <aside class="sidebar">
          <div class="pill">MEDIA ROOM</div>
          <h2>Медиа-служение</h2>
          <p>Быстрый чат в логике Telegram: текст, фото, GIF, голосовые, прыжок вниз и живое поле ввода.</p>
          <div class="section">
            <div class="section-title">Профиль</div>
            <div class="online-item"><span class="dot"></span>${escapeHtml(currentName)}</div>
          </div>
          <div class="section">
            <div class="section-title">Что уже работает</div>
            <p>Текстовые сообщения, фото и GIF, голосовые, удаление своих сообщений и локальное сохранение истории.</p>
          </div>
        </aside>
        <main class="chat">
          <header class="chat-head">
            <div>
              <h1>Чат медиа-служения</h1>
              <p>Pages-версия интерфейса приложения</p>
            </div>
            <div class="head-actions">
              <button class="ghost" id="jumpTopBtn">Вниз</button>
              <button class="ghost" id="renameBtn">Имя</button>
            </div>
          </header>
          <div class="messages" id="messages"></div>
          <div class="typing" id="typingLine"></div>
          <button class="jump hidden" id="jumpBtn">↓</button>
          <div class="composer">
            <div class="tool-row">
              <input id="fileInput" type="file" accept="image/*,image/gif" multiple class="hidden" />
              <button class="ghost" id="pickFilesBtn">Фото / GIF</button>
              <button class="ghost" id="voiceBtn">Голосовое</button>
              <button class="danger" id="clearBtn">Очистить чат</button>
            </div>
            <div class="previews" id="previews"></div>
            <div class="composer-row">
              <textarea id="textInput" placeholder="Напиши сообщение" rows="1"></textarea>
              <button class="send" id="sendBtn">Отправить</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  bindAppEvents();
  renderMessages();
  renderPreviews();
  scrollToBottom();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMessages() {
  const container = document.getElementById('messages');
  if (!container) return;
  container.innerHTML = state.messages.map((message) => {
    const own = message.authorId === state.profile?.id;
    const attachmentsHtml = message.attachments.map((item) => {
      if (item.kind === 'audio') {
        return `<audio controls src="${item.url}"></audio>`;
      }
      return `<img src="${item.url}" alt="${escapeHtml(item.name || 'image')}" />`;
    }).join('');

    return `
      <div class="message ${own ? 'own' : ''}">
        <div class="bubble">
          <div class="meta">
            <strong>${escapeHtml(message.authorName)}</strong>
            <span>${formatTime(message.createdAt)}</span>
            ${own && !message.deletedAt ? `<button class="small-btn" data-delete="${message.id}">Удалить</button>` : ''}
          </div>
          ${message.deletedAt ? `<div class="deleted">Сообщение удалено</div>` : `<div class="text">${escapeHtml(message.text || '')}</div>`}
          ${message.attachments.length ? `<div class="media-grid">${attachmentsHtml}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-delete');
      const target = state.messages.find((item) => item.id === id);
      if (!target) return;
      target.text = '';
      target.deletedAt = new Date().toISOString();
      saveMessages();
      renderMessages();
    };
  });
}

function renderPreviews() {
  const wrap = document.getElementById('previews');
  if (!wrap) return;
  const chips = [];
  state.files.forEach((file) => chips.push(`<span class="preview-chip">${escapeHtml(file.name)}</span>`));
  if (state.audioBlob) chips.push(`<span class="preview-chip">Голосовое готово</span>`);
  wrap.innerHTML = chips.join('');
}

function autoGrow() {
  const input = document.getElementById('textInput');
  if (!input) return;
  input.style.height = '0px';
  input.style.height = Math.min(input.scrollHeight, 190) + 'px';
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function sendMessage() {
  const input = document.getElementById('textInput');
  const text = input.value.trim();
  if (!text && !state.files.length && !state.audioBlob) return;

  const attachments = [];
  for (const file of state.files) {
    const url = await blobToDataUrl(file);
    attachments.push({
      id: crypto.randomUUID(),
      kind: file.type === 'image/gif' ? 'gif' : 'image',
      name: file.name,
      url
    });
  }
  if (state.audioBlob) {
    const url = await blobToDataUrl(state.audioBlob);
    attachments.push({ id: crypto.randomUUID(), kind: 'audio', name: 'voice-message.webm', url });
  }

  state.messages.push({
    id: crypto.randomUUID(),
    authorId: state.profile.id,
    authorName: state.profile.name,
    text,
    attachments,
    createdAt: new Date().toISOString()
  });

  state.files = [];
  state.audioBlob = null;
  input.value = '';
  autoGrow();
  saveMessages();
  renderPreviews();
  renderMessages();
  scrollToBottom();
}

async function toggleRecording(button) {
  if (state.recording && state.recorder) {
    state.recorder.stop();
    state.recording = false;
    button.textContent = 'Голосовое';
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.chunks = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => state.chunks.push(event.data);
  recorder.onstop = () => {
    state.audioBlob = new Blob(state.chunks, { type: 'audio/webm' });
    stream.getTracks().forEach((track) => track.stop());
    renderPreviews();
  };
  recorder.start();
  state.recorder = recorder;
  state.recording = true;
  button.textContent = 'Стоп запись';
}

function bindAppEvents() {
  const textInput = document.getElementById('textInput');
  const fileInput = document.getElementById('fileInput');
  const pickFilesBtn = document.getElementById('pickFilesBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const jumpTopBtn = document.getElementById('jumpTopBtn');
  const renameBtn = document.getElementById('renameBtn');
  const messages = document.getElementById('messages');

  textInput.addEventListener('input', autoGrow);
  textInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  pickFilesBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    state.files = Array.from(fileInput.files || []);
    renderPreviews();
  };
  voiceBtn.onclick = () => toggleRecording(voiceBtn);
  sendBtn.onclick = sendMessage;
  clearBtn.onclick = () => {
    if (!confirm('Очистить локальную историю чата на этой странице?')) return;
    state.messages = [];
    saveMessages();
    renderMessages();
  };
  jumpBtn.onclick = scrollToBottom;
  jumpTopBtn.onclick = scrollToBottom;
  renameBtn.onclick = () => {
    const next = prompt('Новое имя участника', state.profile.name || '');
    if (!next || !next.trim()) return;
    state.profile.name = next.trim();
    saveProfile();
    renderApp();
  };
  messages.addEventListener('scroll', () => {
    const shouldShow = messages.scrollHeight - messages.scrollTop - messages.clientHeight > 180;
    jumpBtn.classList.toggle('hidden', !shouldShow);
  });
  autoGrow();
}

if (!state.profile) {
  renderLogin();
} else {
  renderApp();
}
