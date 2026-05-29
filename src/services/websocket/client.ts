import { io, type Socket } from 'socket.io-client';

import { getSocketUrl } from '@/shared/config';
import type { RelayPayload } from '@/types/message';

interface SocketHandlers {
  onMessage: (payload: RelayPayload) => void;
  onDeliveryFailed: (messageId: string) => void;
}

let socket: Socket | null = null;

/**
 * Подключает приложение к Socket.IO-серверу.
 *
 * Функция создаёт одно подключение, регистрирует deviceId на сервере и вешает
 * обработчики входящих сообщений. Сервер не хранит историю, поэтому входящее
 * сообщение сразу передаётся в клиентский слой для записи в SQLite.
 *
 * @param deviceId Локальный идентификатор устройства текущего пользователя.
 * @param handlers Колбэки для входящих сообщений и ошибок доставки.
 * @returns Активный Socket.IO-клиент.
 */
export function connectSocket(deviceId: string, handlers: SocketHandlers): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(getSocketUrl(), {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket?.emit('register_device', { deviceId });
  });

  socket.on('receive_message', (payload: RelayPayload) => {
    handlers.onMessage(payload);
  });

  socket.on('delivery_failed', ({ messageId }: { messageId: string }) => {
    handlers.onDeliveryFailed(messageId);
  });

  return socket;
}

/**
 * Отправляет личное сообщение через сервер-ретранслятор.
 *
 * @param to DeviceId получателя.
 * @param payload Полезная нагрузка сообщения без серверного хранения.
 * @returns `true`, если сообщение передано в сокет; `false`, если сокет не готов.
 */
export function sendSocketMessage(to: string, payload: RelayPayload): boolean {
  if (!socket?.connected) {
    return false;
  }

  socket.emit('private_message', { to, from: payload.from, payload });
  return true;
}

/**
 * Закрывает активное WebSocket-подключение.
 *
 * @returns Ничего не возвращает; побочный эффект — отключение сокета.
 */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Проверяет состояние текущего WebSocket-подключения.
 *
 * @returns `true`, если сокет существует и подключён к серверу.
 */
export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}
