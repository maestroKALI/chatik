import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { create } from 'zustand';

import { MEDIA_SIZE_LIMIT_BYTES, SELF_CHAT_ID } from '@/shared/config';
import { getMessages, saveChat, saveMessage } from '@/shared/db';
import { createId } from '@/shared/lib/createId';
import { connectSocket, sendSocketMessage } from '@/services/websocket/client';
import { decryptTextMessage, encryptTextMessage } from '@/modules/e2ee/crypto';
import type { LocalIdentity } from '@/types/identity';
import type { Chat, Message, MessageType, RelayPayload } from '@/types/message';

interface MessagingState {
  chat: Chat | null;
  messages: Message[];
  isReady: boolean;
  identity: LocalIdentity | null;
  initializeMessaging: (identity: LocalIdentity) => Promise<void>;
  loadMessages: () => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
  sendImageMessage: () => Promise<void>;
  sendMediaMessage: (type: Extract<MessageType, 'voice' | 'video'>, fileUri: string, duration?: number) => Promise<void>;
  receiveRelayMessage: (payload: RelayPayload) => Promise<void>;
}

/**
 * Преобразует локальный файл в base64 для передачи через WebSocket.
 *
 * @param fileUri Локальный URI файла в файловой системе приложения.
 * @returns Base64-строка содержимого файла.
 */
async function readFileAsBase64(fileUri: string): Promise<string> {
  return FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
}

/**
 * Проверяет размер файла перед отправкой через WebSocket.
 *
 * @param fileUri Локальный URI файла.
 * @returns `true`, если файл помещается в лимит MVP.
 */
async function isFileSmallEnough(fileUri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(fileUri);
  return Boolean(info.exists && typeof info.size === 'number' && info.size <= MEDIA_SIZE_LIMIT_BYTES);
}

/**
 * Сохраняет base64-медиа в локальный каталог приложения.
 *
 * @param messageId Идентификатор сообщения, который используется в имени файла.
 * @param base64Payload Содержимое файла в base64.
 * @param extension Расширение файла без точки.
 * @returns URI сохранённого файла внутри документа приложения.
 */
async function writeBase64ToLocalFile(messageId: string, base64Payload: string, extension: string): Promise<string> {
  const directory = `${FileSystem.documentDirectory ?? ''}media/`;
  const fileUri = `${directory}${messageId}.${extension}`;
  const directoryInfo = await FileSystem.getInfoAsync(directory);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  await FileSystem.writeAsStringAsync(fileUri, base64Payload, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

/**
 * Создаёт локальное сообщение и сразу сохраняет его в SQLite.
 *
 * @param identity Личность текущего пользователя.
 * @param type Тип сообщения.
 * @param data Дополнительные поля сообщения.
 * @returns Сохранённое сообщение.
 */
async function createOutgoingMessage(
  identity: LocalIdentity,
  type: MessageType,
  data: Partial<Message>,
): Promise<Message> {
  const message: Message = {
    id: createId('msg'),
    chatId: SELF_CHAT_ID,
    from: identity.deviceId,
    to: identity.deviceId,
    type,
    timestamp: Date.now(),
    isOutgoing: true,
    status: 'pending',
    ...data,
  };

  await saveMessage(message);
  return message;
}

/**
 * Преобразует сообщение в полезную нагрузку для сервера-ретранслятора.
 *
 * @param message Локальное сообщение из SQLite/Zustand.
 * @returns Объект без клиентских полей `isOutgoing`, `status` и `fileUri`.
 */
function toRelayPayload(message: Message): RelayPayload {
  return {
    id: message.id,
    chatId: message.chatId,
    from: message.from,
    to: message.to,
    text: message.text,
    type: message.type,
    timestamp: message.timestamp,
    base64Payload: message.base64Payload,
    mimeType: message.mimeType,
    duration: message.duration,
    isEncrypted: message.isEncrypted,
    senderPublicKey: message.senderPublicKey,
  };
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  chat: null,
  messages: [],
  isReady: false,
  identity: null,

  /**
   * Инициализирует тестовый чат и подключение к серверу.
   *
   * @param identity Локальная личность пользователя.
   * @returns Промис без значения после загрузки истории и подключения сокета.
   */
  async initializeMessaging(identity) {
    const now = Date.now();
    const chat: Chat = {
      id: SELF_CHAT_ID,
      title: 'Saved Messages',
      peerDeviceId: identity.deviceId,
      createdAt: now,
      updatedAt: now,
    };

    await saveChat(chat);
    const messages = await getMessages(chat.id);

    connectSocket(identity.deviceId, identity.sessionToken, {
      onMessage: (payload) => {
        void get().receiveRelayMessage(payload);
      },
      onDeliveryFailed: async (messageId) => {
        const updatedMessages = get().messages.map((message) =>
          message.id === messageId ? { ...message, status: 'failed' as const } : message,
        );
        set({ messages: updatedMessages });
      },
    });

    set({ chat, identity, messages, isReady: true });
  },

  /**
   * Загружает историю сообщений текущего чата из SQLite.
   *
   * @returns Промис без значения после обновления Zustand-store.
   */
  async loadMessages() {
    const chat = get().chat;

    if (!chat) {
      return;
    }

    const messages = await getMessages(chat.id);
    set({ messages });
  },

  /**
   * Отправляет текстовое сообщение в тестовый self-chat.
   *
   * @param text Текст, введённый пользователем.
   * @returns Промис без значения после локального сохранения и отправки в сокет.
   */
  async sendTextMessage(text) {
    const identity = get().identity;
    const trimmedText = text.trim();

    if (!identity || !trimmedText) {
      return;
    }

    const recipientPublicKey = identity.publicKey;
    const encryptedText = recipientPublicKey
      ? await encryptTextMessage(trimmedText, recipientPublicKey)
      : trimmedText;
    const message = await createOutgoingMessage(identity, 'text', {
      text: trimmedText,
      isEncrypted: Boolean(recipientPublicKey),
      senderPublicKey: identity.publicKey,
    });
    const sent = sendSocketMessage(identity.deviceId, {
      ...toRelayPayload(message),
      text: encryptedText,
      isEncrypted: Boolean(recipientPublicKey),
      senderPublicKey: identity.publicKey,
    });
    const finalMessage = { ...message, status: sent ? ('sent' as const) : ('failed' as const) };

    await saveMessage(finalMessage);
    set({ messages: [...get().messages, finalMessage] });
  },

  /**
   * Выбирает изображение из галереи и отправляет его через WebSocket в base64.
   *
   * @returns Промис без значения после сохранения и отправки изображения.
   */
  async sendImageMessage() {
    const identity = get().identity;

    if (!identity) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Для выбора изображения нужен доступ к галерее.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const isSmall = await isFileSmallEnough(asset.uri);

    if (!isSmall) {
      Alert.alert('Файл слишком большой', 'В MVP изображения через WebSocket ограничены 3 МБ.');
      return;
    }

    const base64Payload = await readFileAsBase64(asset.uri);
    const message = await createOutgoingMessage(identity, 'image', {
      fileUri: asset.uri,
      base64Payload,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
    const sent = sendSocketMessage(identity.deviceId, toRelayPayload(message));
    const finalMessage = { ...message, status: sent ? ('sent' as const) : ('failed' as const) };

    await saveMessage(finalMessage);
    set({ messages: [...get().messages, finalMessage] });
  },

  /**
   * Отправляет голосовое или видеосообщение через WebSocket в base64.
   *
   * @param type Тип медиа: голосовое сообщение или видеокружочек.
   * @param fileUri Локальный URI записанного файла.
   * @param duration Длительность записи в миллисекундах.
   * @returns Промис без значения после сохранения и отправки медиа.
   */
  async sendMediaMessage(type, fileUri, duration) {
    const identity = get().identity;

    if (!identity) {
      return;
    }

    const isSmall = await isFileSmallEnough(fileUri);
    if (!isSmall) {
      Alert.alert('Файл слишком большой', 'В MVP голосовые и видео ограничены 3 МБ.');
      return;
    }

    const base64Payload = await readFileAsBase64(fileUri);
    const message = await createOutgoingMessage(identity, type, {
      fileUri,
      base64Payload,
      duration,
      mimeType: type === 'voice' ? 'audio/m4a' : 'video/mp4',
    });
    const sent = sendSocketMessage(identity.deviceId, toRelayPayload(message));
    const finalMessage = { ...message, status: sent ? ('sent' as const) : ('failed' as const) };

    await saveMessage(finalMessage);
    set({ messages: [...get().messages, finalMessage] });
  },

  /**
   * Обрабатывает входящее сообщение от сервера-ретранслятора.
   *
   * @param payload Сообщение без серверного хранения, полученное через Socket.IO.
   * @returns Промис без значения после записи в SQLite и обновления UI.
   */
  async receiveRelayMessage(payload) {
    const extensionByType: Record<MessageType, string> = {
      text: 'txt',
      image: 'jpg',
      voice: 'm4a',
      video: 'mp4',
      file: 'bin',
    };
    const fileUri = payload.base64Payload
      ? await writeBase64ToLocalFile(payload.id, payload.base64Payload, extensionByType[payload.type])
      : undefined;
    const decryptedText = payload.isEncrypted && payload.text && payload.senderPublicKey
      ? await decryptTextMessage(payload.text, payload.senderPublicKey)
      : payload.text;
    const message: Message = {
      id: payload.id,
      chatId: payload.chatId,
      from: payload.from,
      to: payload.to,
      text: decryptedText ?? '[Не удалось расшифровать сообщение]',
      type: payload.type,
      timestamp: payload.timestamp,
      isOutgoing: payload.from === get().identity?.deviceId,
      fileUri,
      base64Payload: payload.base64Payload,
      mimeType: payload.mimeType,
      duration: payload.duration,
      status: 'delivered',
      isEncrypted: Boolean(payload.isEncrypted),
      senderPublicKey: payload.senderPublicKey,
    };

    await saveMessage(message);
    set({ messages: [...get().messages.filter((item) => item.id !== message.id), message] });
  },
}));
