require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
const server = http.createServer(app);
const onlineDevices = new Map();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6,
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
  /**
   * Регистрирует устройство в памяти сервера.
   *
   * Сервер хранит только соответствие deviceId -> socketId для онлайн-доставки.
   * История сообщений и профили здесь не сохраняются.
   */
  socket.on('register_device', ({ deviceId }) => {
    if (typeof deviceId === 'string' && deviceId.length > 0) {
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
