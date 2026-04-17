import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

type Attachment = {
  id: string;
  kind: 'image' | 'audio' | 'gif';
  name: string;
  mimeType: string;
  size: number;
  url: string;
};

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  attachments: Attachment[];
  createdAt: string;
  deletedAt?: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, { autoConnect: true });

export default function App() {
  const [name, setName] = useState(localStorage.getItem('gvbs_name') || '');
  const [ready, setReady] = useState(Boolean(localStorage.getItem('gvbs_name')));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [typingName, setTypingName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; name: string }[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showJump, setShowJump] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const userId = useMemo(() => {
    const saved = localStorage.getItem('gvbs_user_id');
    if (saved) return saved;
    const next = crypto.randomUUID();
    localStorage.setItem('gvbs_user_id', next);
    return next;
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/messages`).then((res) => res.json()).then((data) => {
      setMessages(data.messages || []);
      setOnlineUsers(data.onlineUsers || []);
      setTimeout(scrollToBottom, 80);
    });

    socket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(scrollToBottom, 80);
    });
    socket.on('message:deleted', ({ id, deletedAt }: { id: string; deletedAt: string }) => {
      setMessages((prev) => prev.map((item) => item.id === id ? { ...item, text: '', deletedAt } : item));
    });
    socket.on('presence:update', (users: { userId: string; name: string }[]) => setOnlineUsers(users));
    socket.on('typing:update', ({ name }: { userId: string; name: string }) => setTypingName(name));
    socket.on('typing:stop', () => setTypingName(''));

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.off('presence:update');
      socket.off('typing:update');
      socket.off('typing:stop');
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    socket.emit('presence:join', { userId, name });
  }, [ready, userId, name]);

  useEffect(() => {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = '0px';
    area.style.height = `${Math.min(area.scrollHeight, 180)}px`;
  }, [text]);

  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  async function handleSend() {
    if (!text.trim() && files.length === 0 && !audioBlob) return;
    const form = new FormData();
    form.append('authorId', userId);
    form.append('authorName', name);
    form.append('text', text);
    files.forEach((file) => form.append('files', file));
    if (audioBlob) form.append('files', new File([audioBlob], 'voice-message.webm', { type: audioBlob.type || 'audio/webm' }));
    await fetch(`${API_URL}/api/messages`, { method: 'POST', body: form });
    setText('');
    setFiles([]);
    setAudioBlob(null);
    socket.emit('typing:stop', { userId });
  }

  async function deleteMessage(id: string) {
    await fetch(`${API_URL}/api/messages/${id}`, { method: 'DELETE' });
  }

  async function toggleRecording() {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  if (!ready) {
    return (
      <div className="shell login-shell">
        <div className="card login-card">
          <div className="pill">GVBS Media</div>
          <h1>Вход в чат</h1>
          <p>Введи имя участника служения, чтобы открыть рабочий чат команды.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Сергей монтаж" />
          <button onClick={() => { if (!name.trim()) return; localStorage.setItem('gvbs_name', name); setReady(true); }}>Открыть чат</button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell app-shell">
      <aside className="sidebar">
        <div className="block">
          <div className="pill">MEDIA ROOM</div>
          <h2>Медиа-служение</h2>
          <p>Текст, фото, GIF и голосовые без перегруза по интерфейсу.</p>
        </div>
        <div className="block">
          <h3>Онлайн</h3>
          <div className="online-list">
            {onlineUsers.map((user) => <div key={user.userId} className="online-item"><span className="dot" />{user.name}</div>)}
          </div>
        </div>
      </aside>
      <main className="chat">
        <header className="chat-header">
          <div>
            <h1>Чат медиа-служения</h1>
            <p>{onlineUsers.length} участников онлайн</p>
          </div>
          <button className="ghost" onClick={scrollToBottom}>Вниз</button>
        </header>

        <div className="messages" ref={listRef} onScroll={(e) => {
          const el = e.currentTarget;
          setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 180);
        }}>
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.authorId === userId ? 'own' : ''}`}>
              <div className="bubble">
                <div className="meta"><strong>{message.authorName}</strong><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{message.authorId === userId && !message.deletedAt ? <button onClick={() => deleteMessage(message.id)}>Удалить</button> : null}</div>
                {message.deletedAt ? <div className="deleted">Сообщение удалено</div> : <div className="text">{message.text}</div>}
                {message.attachments.map((attachment) => attachment.kind === 'audio' ? (
                  <audio key={attachment.id} controls src={`${API_URL}${attachment.url}`} />
                ) : (
                  <img key={attachment.id} src={`${API_URL}${attachment.url}`} alt={attachment.name} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {typingName ? <div className="typing">{typingName} печатает…</div> : null}
        {showJump ? <button className="jump" onClick={scrollToBottom}>↓</button> : null}

        <div className="composer">
          <div className="composer-tools">
            <input id="file-input" type="file" accept="image/*,image/gif" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            <label htmlFor="file-input" className="ghost">Фото / GIF</label>
            <button className={recording ? 'danger' : 'ghost'} onClick={toggleRecording}>{recording ? 'Стоп' : 'Голосовое'}</button>
          </div>
          {files.length ? <div className="preview">{files.map((file) => <span key={file.name}>{file.name}</span>)}</div> : null}
          {audioBlob ? <div className="preview"><span>Голосовое готово к отправке</span></div> : null}
          <div className="composer-row">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                socket.emit('typing:start', { userId, name });
              }}
              placeholder="Напиши сообщение"
              rows={1}
            />
            <button className="send" onClick={handleSend}>Отправить</button>
          </div>
        </div>
      </main>
    </div>
  );
}
