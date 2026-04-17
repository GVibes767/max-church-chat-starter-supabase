import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

const messages: any[] = [
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
  res.json({ ok: true });
});

app.get('/api/messages', (_, res) => {
  res.json({ messages, onlineUsers: Array.from(onlineUsers, ([userId, name]) => ({ userId, name })) });
});

app.post('/api/messages', upload.array('files', 6), (req, res) => {
  const text = String(req.body.text ?? '');
  const authorId = String(req.body.authorId ?? 'guest');
  const authorName = String(req.body.authorName ?? 'Участник');
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  const attachments = files.map((file) => ({
    id: randomUUID(),
    kind: file.mimetype.startsWith('audio/') ? 'audio' : file.mimetype === 'image/gif' ? 'gif' : 'image',
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`
  }));

  const message = {
    id: randomUUID(),
    authorId,
    authorName,
    text,
    attachments,
    createdAt: new Date().toISOString()
  };

  messages.push(message);
  io.emit('message:new', message);
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
