require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const rateLimit = require('express-rate-limit');
const { createId } = require('@paralleldrive/cuid2');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'chatik.sqlite');
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const app = express();
const server = http.createServer(app);
const onlineDevices = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    displayName TEXT NOT NULL,
    publicKey TEXT NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registration_challenges (
    id TEXT PRIMARY KEY NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    displayName TEXT NOT NULL,
    publicKey TEXT NOT NULL,
    otpHash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    tokenHash TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );
`);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '5mb' }));
app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'too_many_auth_attempts' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'too_many_otp_requests' },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'too_many_search_requests' },
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6,
});

/**
 * Нормализует телефон для поиска и уникального хранения.
 *
 * @param {string} phone Номер телефона из клиентской формы.
 * @returns {string} Номер без пробелов, скобок и дефисов.
 */
function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

/**
 * Возвращает SHA-256 хеш значения для безопасного сравнения токенов и OTP.
 *
 * @param {string} value Секретное значение.
 * @returns {string} Hex-представление SHA-256.
 */
function hashSecret(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Генерирует одноразовый код подтверждения e-mail для MVP-заглушки.
 *
 * @returns {string} Шестизначный OTP-код.
 */
function createOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Создаёт сессию пользователя и возвращает только исходный токен клиенту.
 *
 * Сервер хранит хеш токена, поэтому утечка SQLite-файла не раскрывает активные
 * bearer-токены напрямую.
 *
 * @param {string} userId Идентификатор пользователя.
 * @returns {{ token: string, expiresAt: number }} Bearer-токен и время истечения.
 */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  db.prepare('INSERT INTO sessions (tokenHash, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)').run(
    hashSecret(token),
    userId,
    expiresAt,
    now,
  );

  return { token, expiresAt };
}

/**
 * Находит пользователя по Bearer-токену.
 *
 * @param {string | undefined} authorization Заголовок Authorization.
 * @returns {object | null} Пользователь или null, если токен отсутствует/истёк.
 */
function findUserByAuthorization(authorization) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    return null;
  }

  const row = db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.userId
    WHERE sessions.tokenHash = ? AND sessions.expiresAt > ?
  `).get(hashSecret(token), Date.now());

  return row || null;
}

/**
 * Требует авторизацию для HTTP endpoint'ов.
 *
 * @param {import('express').Request} request Express-запрос.
 * @param {import('express').Response} response Express-ответ.
 * @param {Function} next Следующий middleware.
 * @returns {void}
 */
function requireAuth(request, response, next) {
  const user = findUserByAuthorization(request.headers.authorization);

  if (!user) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  request.user = user;
  next();
}

/**
 * Возвращает публичный объект пользователя без секретов.
 *
 * @param {object} user Запись пользователя из SQLite.
 * @returns {object} Безопасные поля пользователя для клиента.
 */
function toPublicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    deviceId: user.deviceId,
    displayName: user.displayName,
    publicKey: user.publicKey,
    emailVerified: Boolean(user.emailVerified),
  };
}

app.post('/api/auth/register/start', otpLimiter, async (request, response) => {
  const phone = normalizePhone(request.body.phone);
  const email = String(request.body.email || '').trim().toLowerCase();
  const password = String(request.body.password || '');
  const deviceId = String(request.body.deviceId || '').trim();
  const displayName = String(request.body.displayName || 'User').trim();
  const publicKey = String(request.body.publicKey || '').trim();

  if (!phone || !email.includes('@') || password.length < 8 || !deviceId || !publicKey) {
    response.status(400).json({ error: 'invalid_registration_payload' });
    return;
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (existingUser && existingUser.deviceId !== deviceId) {
    response.status(409).json({ error: 'phone_bound_to_another_device' });
    return;
  }

  const otpCode = createOtpCode();
  const now = Date.now();
  const challengeId = createId();
  const passwordHash = await bcrypt.hash(password, 12);

  db.prepare('DELETE FROM registration_challenges WHERE phone = ? OR expiresAt <= ?').run(phone, now);
  db.prepare(`
    INSERT INTO registration_challenges (
      id, phone, email, passwordHash, deviceId, displayName, publicKey, otpHash, expiresAt, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(challengeId, phone, email, passwordHash, deviceId, displayName, publicKey, hashSecret(otpCode), now + OTP_TTL_MS, now);

  if (process.env.NODE_ENV !== 'production') {
    process.stdout.write(`OTP for ${phone}: ${otpCode}\n`);
  }

  response.json({
    challengeId,
    expiresAt: now + OTP_TTL_MS,
    devOtpCode: process.env.NODE_ENV === 'production' ? undefined : otpCode,
  });
});

app.post('/api/auth/register/verify', authLimiter, (request, response) => {
  const challengeId = String(request.body.challengeId || '').trim();
  const otpCode = String(request.body.otpCode || '').trim();
  const now = Date.now();
  const challenge = db.prepare('SELECT * FROM registration_challenges WHERE id = ?').get(challengeId);

  if (!challenge || challenge.expiresAt <= now) {
    response.status(400).json({ error: 'invalid_or_expired_challenge' });
    return;
  }

  if (challenge.attempts >= 5 || hashSecret(otpCode) !== challenge.otpHash) {
    db.prepare('UPDATE registration_challenges SET attempts = attempts + 1 WHERE id = ?').run(challengeId);
    response.status(400).json({ error: 'invalid_otp' });
    return;
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(challenge.phone);
  const userId = existingUser?.id || createId();

  if (existingUser) {
    db.prepare(`
      UPDATE users
      SET email = ?, passwordHash = ?, displayName = ?, publicKey = ?, emailVerified = 1, updatedAt = ?
      WHERE id = ?
    `).run(challenge.email, challenge.passwordHash, challenge.displayName, challenge.publicKey, now, userId);
  } else {
    db.prepare(`
      INSERT INTO users (id, phone, email, passwordHash, deviceId, displayName, publicKey, emailVerified, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(userId, challenge.phone, challenge.email, challenge.passwordHash, challenge.deviceId, challenge.displayName, challenge.publicKey, now, now);
  }

  db.prepare('DELETE FROM registration_challenges WHERE id = ?').run(challengeId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const session = createSession(userId);

  response.json({ user: toPublicUser(user), session });
});

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const phone = normalizePhone(request.body.phone);
  const password = String(request.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (!user || !user.emailVerified) {
    response.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    response.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const session = createSession(user.id);
  response.json({ user: toPublicUser(user), session });
});

app.get('/api/users/search', searchLimiter, requireAuth, (request, response) => {
  const phone = normalizePhone(request.query.phone);

  if (!phone) {
    response.status(400).json({ error: 'phone_required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ? AND emailVerified = 1').get(phone);

  response.json({ user: user ? toPublicUser(user) : null });
});

app.get('/api/users/public-key', searchLimiter, requireAuth, (request, response) => {
  const phone = normalizePhone(request.query.phone);
  const deviceId = String(request.query.deviceId || '').trim();
  const user = phone
    ? db.prepare('SELECT * FROM users WHERE phone = ? AND emailVerified = 1').get(phone)
    : db.prepare('SELECT * FROM users WHERE deviceId = ? AND emailVerified = 1').get(deviceId);

  response.json({ user: user ? toPublicUser(user) : null });
});

/**
 * Возвращает deviceId по socket.id.
 *
 * @param {string} socketId Идентификатор подключения Socket.IO.
 * @returns {string | undefined} Найденный deviceId или undefined, если сокет не зарегистрирован.
 */
function findDeviceIdBySocket(socketId) {
  for (const [deviceId, savedSocketId] of onlineDevices.entries()) {
    if (savedSocketId === socketId) {
      return deviceId;
    }
  }

  return undefined;
}

/**
 * Ретранслирует событие сигнализации WebRTC между двумя онлайн-клиентами.
 *
 * @param {string} eventName Название события Socket.IO.
 * @param {{ to: string, from: string, payload: unknown }} message Данные сигнализации.
 * @returns {boolean} true, если получатель найден онлайн.
 */
function relaySignal(eventName, message) {
  const targetSocketId = onlineDevices.get(message.to);

  if (!targetSocketId) {
    return false;
  }

  io.to(targetSocketId).emit(eventName, message);
  return true;
}

io.on('connection', (socket) => {
  const user = findUserByAuthorization(`Bearer ${socket.handshake.auth?.token || ''}`);

  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.user = user;

  /**
   * Регистрирует устройство в памяти сервера.
   *
   * Сервер хранит только соответствие deviceId -> socketId для онлайн-доставки.
   * История сообщений и профили здесь не сохраняются.
   */
  socket.on('register_device', ({ deviceId }) => {
    if (deviceId === socket.user.deviceId) {
      onlineDevices.set(deviceId, socket.id);
    }
  });

  /**
   * Пересылает личное сообщение получателю, если он онлайн.
   *
   * Если получатель офлайн, сервер возвращает отправителю `delivery_failed` и
   * не кладёт сообщение ни в какую очередь.
   */
  socket.on('private_message', ({ to, payload }) => {
    if (!payload || payload.from !== socket.user.deviceId) {
      socket.emit('delivery_failed', { messageId: payload?.id });
      return;
    }

    const targetSocketId = onlineDevices.get(to);

    if (!targetSocketId) {
      socket.emit('delivery_failed', { messageId: payload?.id });
      return;
    }

    io.to(targetSocketId).emit('receive_message', payload);
  });

  socket.on('call_offer', (message) => relaySignal('call_offer', message));
  socket.on('call_answer', (message) => relaySignal('call_answer', message));
  socket.on('ice_candidate', (message) => relaySignal('ice_candidate', message));
  socket.on('call_end', (message) => relaySignal('call_end', message));

  /**
   * Удаляет устройство из онлайн-карты при отключении сокета.
   */
  socket.on('disconnect', () => {
    const deviceId = findDeviceIdBySocket(socket.id);

    if (deviceId) {
      onlineDevices.delete(deviceId);
    }
  });
});

/**
 * Проверяет, что сервер жив и готов принимать WebSocket-подключения.
 */
app.get('/health', (_request, response) => {
  response.json({ ok: true, onlineDevices: onlineDevices.size });
});

server.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    process.stdout.write(`Relay server is running on port ${PORT}\n`);
  }
});
