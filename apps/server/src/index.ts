import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
const dataDir = path.join(rootDir, 'data');
const subscriptionsFile = path.join(dataDir, 'push-subscriptions.json');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(subscriptionsFile)) fs.writeFileSync(subscriptionsFile, '[]', 'utf-8');

type Attachment = {
  id: string;
  kind: 'audio' | 'gif' | 'image';
  name: string;
  mimeType?: string;
  size?: number;
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

type StoredPushSubscription = {
  id: string;
  userId: string;
  subscription: webpush.PushSubscription;
  createdAt: string;
};

function loadSubscriptions(): StoredPushSubscription[] {
  try {
    return JSON.parse(fs.readFileSync(subscriptionsFile, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSubscriptions(list: StoredPushSubscription[]) {
  fs.writeFileSync(subscriptionsFile, JSON.stringify(list, null, 2), 'utf-8');
}

function setPushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

const pushEnabled = setPushConfig();

async function sendPushToSubscribers(message: Message) {
  if (!pushEnabled) return;
  const all = loadSubscriptions();
  const payload = JSON.stringify({
    title: `Новое сообщение: ${message.authorName}`,
    body: message.text || 'Фото / голосовое сообщение',
    data: { url: process.env.APP_URL ?? 'http://localhost:5173' }
  });

  const survivors: StoredPushSubscription[] = [];
  for (const item of all) {
    if (item.userId === message.authorId) {
      survivors.push(item);
      continue;
    }
    try {
      await webpush.sendNotification(item.subscription, payload);
      survivors.push(item);
    } catch (error: any) {
      if (error?.statusCode !== 404 && error?.statusCode !== 410) {
        survivors.push(item);
      }
    }
  }
  saveSubscriptions(survivors);
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE']
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadsDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname) || ''}`)
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const messages: Message[] = [
  {
    id: randomUUID(),
    authorId: 'system',
    authorName: 'Media Bot',
    text: 'Добро пожаловать в чат медиа-служения.',
    attachments: [],
    createdAt: new Date().toISOString()
  }
];

const onlineUsers = new Map<string, string>();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_, res) => {
  res.json({ ok: true, pushEnabled });
});

app.get('/api/push/public-key', (_, res) => {
  res.json({ enabled: pushEnabled, publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
});

app.post('/api/push/subscribe', (req, res) => {
  const userId = String(req.body.userId ?? '');
  const subscription = req.body.subscription as webpush.PushSubscription | undefined;
  if (!userId || !subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription payload' });

  const current = loadSubscriptions();
  const deduped = current.filter((item) => item.subscription.endpoint !== subscription.endpoint);
  deduped.push({ id: randomUUID(), userId, subscription, createdAt: new Date().toISOString() });
  saveSubscriptions(deduped);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const endpoint = String(req.body.endpoint ?? '');
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  const filtered = loadSubscriptions().filter((item) => item.subscription.endpoint !== endpoint);
  saveSubscriptions(filtered);
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  if (!pushEnabled) return res.status(400).json({ error: 'Push is not configured on backend' });
  const userId = String(req.body.userId ?? '');
  const target = loadSubscriptions().filter((item) => item.userId === userId);
  await Promise.all(target.map((item) => webpush.sendNotification(item.subscription, JSON.stringify({ title: 'Тестовое уведомление', body: 'Push backend работает.', data: { url: process.env.APP_URL ?? 'http://localhost:5173' } })).catch(() => null)));
  res.json({ ok: true, sent: target.length });
});

app.get('/api/messages', (_, res) => {
  res.json({ messages, onlineUsers: Array.from(onlineUsers, ([userId, name]) => ({ userId, name })) });
});

app.post('/api/messages', upload.array('files', 6), async (req, res) => {
  const text = String(req.body.text ?? '');
  const authorId = String(req.body.authorId ?? 'guest');
  const authorName = String(req.body.authorName ?? 'Участник');
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  const attachments: Attachment[] = files.map((file) => ({
    id: randomUUID(),
    kind: file.mimetype.startsWith('audio/') ? 'audio' : file.mimetype === 'image/gif' ? 'gif' : 'image',
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`
  }));

  const message: Message = {
    id: randomUUID(),
    authorId,
    authorName,
    text,
    attachments,
    createdAt: new Date().toISOString()
  };

  messages.push(message);
  io.emit('message:new', message);
  await sendPushToSubscribers(message);
  res.json({ message });
});

app.delete('/api/messages/:id', (req, res) => {
  const index = messages.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  messages[index] = { ...messages[index], text: '', deletedAt: new Date().toISOString() };
  io.emit('message:deleted', { id: req.params.id, deletedAt: messages[index].deletedAt });
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.on('presence:join', (payload: { userId: string; name: string }) => {
    onlineUsers.set(payload.userId, payload.name);
    io.emit('presence:update', Array.from(onlineUsers, ([userId, name]) => ({ userId, name })));
  });

  socket.on('typing:start', (payload: { userId: string; name: string }) => {
    socket.broadcast.emit('typing:update', payload);
  });

  socket.on('typing:stop', (payload: { userId: string }) => {
    socket.broadcast.emit('typing:stop', payload);
  });

  socket.on('disconnect', () => {
    for (const [userId] of onlineUsers.entries()) {
      if (userId === socket.id) onlineUsers.delete(userId);
    }
    io.emit('presence:update', Array.from(onlineUsers, ([userId, name]) => ({ userId, name })));
  });
});

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
