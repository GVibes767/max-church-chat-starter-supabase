const BACKEND_KEY = 'gvbs_push_backend_url';
const DEFAULT_BACKEND = '';

function pushBackendUrl() {
  return localStorage.getItem(BACKEND_KEY) || DEFAULT_BACKEND;
}

function setPushBackendUrl(url) {
  localStorage.setItem(BACKEND_KEY, url);
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('gvbs-pages-profile') || 'null');
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function supportMessage() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;
  if (!('Notification' in window)) {
    return isIOS
      ? 'На iPhone открой сайт в Safari, добавь на экран «Домой» и открой уже с иконки.'
      : 'Этот браузер не даёт доступ к веб-уведомлениям.';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return isIOS && !standalone
      ? 'Для iPhone сначала установи сайт на главный экран и открой как приложение.'
      : 'Push API недоступен в текущем браузере.';
  }
  return 'Поддержка push доступна.';
}

function injectPushSettings() {
  const card = document.querySelector('#notifyTab .notify-card');
  if (!card || card.querySelector('.push-settings')) return;
  const backend = pushBackendUrl();
  const block = document.createElement('div');
  block.className = 'push-settings';
  block.innerHTML = `
    <div class="section-title">Push backend</div>
    <p class="muted">Укажи адрес backend, который будет хранить подписки и отправлять push.</p>
    <div class="notify-actions">
      <input class="input" id="pushBackendInput" placeholder="https://your-backend.onrender.com" value="${backend}">
      <button class="ghost" id="saveBackendBtn">Сохранить backend URL</button>
    </div>
    <div class="notify-note">${supportMessage()}</div>
  `;
  card.appendChild(block);
}

async function enablePushFlow() {
  const backend = (document.querySelector('#pushBackendInput')?.value || pushBackendUrl() || '').trim();
  if (!backend) {
    alert('Сначала укажи URL backend для push.');
    return;
  }
  setPushBackendUrl(backend);

  const profile = getProfile();
  if (!profile?.id) {
    alert('Сначала зайди в чат под своим именем.');
    return;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert(supportMessage());
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Браузер не дал разрешение на уведомления.');
    return;
  }

  const registration = await navigator.serviceWorker.register('./sw.js?v=7');
  await navigator.serviceWorker.ready;

  const keyResp = await fetch(`${backend}/api/push/public-key`);
  const keyData = await keyResp.json();
  if (!keyData?.enabled || !keyData?.publicKey) {
    alert('Push backend ещё не настроен: нет VAPID ключей.');
    return;
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
    });
  }

  await fetch(`${backend}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: profile.id, subscription })
  });

  alert('Push-подписка сохранена. Теперь проверь тестовое уведомление.');
}

async function testPushFlow() {
  const backend = (document.querySelector('#pushBackendInput')?.value || pushBackendUrl() || '').trim();
  const profile = getProfile();
  if (!backend || !profile?.id) {
    alert('Нужен backend URL и активный профиль пользователя.');
    return;
  }
  const resp = await fetch(`${backend}/api/push/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: profile.id })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    alert(data?.error || 'Не удалось отправить тестовое push-уведомление.');
    return;
  }
  alert(`Тест отправлен. Подписок найдено: ${data.sent ?? 0}`);
}

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.id === 'enableNotifyBtn') {
    event.preventDefault();
    event.stopPropagation();
    await enablePushFlow();
  }

  if (target.id === 'testNotifyBtn') {
    event.preventDefault();
    event.stopPropagation();
    await testPushFlow();
  }

  if (target.id === 'saveBackendBtn') {
    event.preventDefault();
    const input = document.querySelector('#pushBackendInput');
    if (input instanceof HTMLInputElement) {
      setPushBackendUrl(input.value.trim());
      alert('URL backend сохранён.');
    }
  }
}, true);

const observer = new MutationObserver(() => injectPushSettings());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', injectPushSettings);
