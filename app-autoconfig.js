const DEFAULT_PUSH_BACKEND = 'https://max-church-chat-starter-supabase.onrender.com';
localStorage.setItem('gvbs_push_backend_url', DEFAULT_PUSH_BACKEND);

function patchUi() {
  const input = document.querySelector('#pushBackendInput');
  if (input instanceof HTMLInputElement) {
    input.value = DEFAULT_PUSH_BACKEND;
    input.readOnly = true;
  }

  const saveBtn = document.querySelector('#saveBackendBtn');
  if (saveBtn instanceof HTMLElement) {
    saveBtn.style.display = 'none';
  }

  const pushSettings = document.querySelector('.push-settings');
  if (pushSettings instanceof HTMLElement) {
    const note = pushSettings.querySelector('.notify-note');
    if (note) note.textContent = 'Backend push уже встроен. Пользователю нужно только включить уведомления.';
  }

  const openBtn = document.querySelector('#openRegPdf');
  if (openBtn instanceof HTMLElement) {
    openBtn.style.display = 'none';
  }

  const downloadBtn = document.querySelector('#downloadRegPdf');
  if (downloadBtn instanceof HTMLElement) {
    downloadBtn.textContent = 'Скачать регламент PDF';
    downloadBtn.classList.add('primary');
  }

  const frame = document.querySelector('#regPdfFrame');
  if (frame instanceof HTMLElement) {
    frame.style.display = 'none';
  }

  const heroText = document.querySelector('.reg-hero .muted');
  if (heroText instanceof HTMLElement) {
    heroText.textContent = 'Здесь доступен готовый PDF-файл регламента. Его можно скачать одним нажатием.';
  }
}

const observer = new MutationObserver(() => patchUi());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', patchUi);
