import * as SQLite from 'expo-sqlite';

import type { Chat, Message } from '@/types/message';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

interface MessageRow {
  id: string;
  chatId: string;
  sender: string;
  recipient: string;
  text?: string | null;
  type: Message['type'];
  timestamp: number;
  isOutgoing: number;
  fileUri?: string | null;
  base64Payload?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  status: Message['status'];
}

/**
 * Возвращает единый экземпляр подключения к SQLite.
 *
 * Функция лениво открывает базу данных при первом обращении и переиспользует
 * один промис подключения. Это защищает приложение от лишних открытий базы при
 * перерендерах React-компонентов.
 *
 * @returns Промис с подключением к локальной базе SQLite.
 */
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('messenger.db');
  }

  return dbPromise;
}

/**
 * Инициализирует локальную базу данных приложения.
 *
 * Функция создаёт таблицы `chats` и `messages`, если они ещё не существуют.
 * Сервер историю не хранит, поэтому эта база является единственным постоянным
 * источником истории переписки на устройстве.
 *
 * @returns Промис, который завершается после создания нужных таблиц.
 */
export async function initDB(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      peerDeviceId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      chatId TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      text TEXT,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      isOutgoing INTEGER NOT NULL,
      fileUri TEXT,
      base64Payload TEXT,
      mimeType TEXT,
      duration INTEGER,
      status TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chats (id) ON DELETE CASCADE
    );
  `);
}

/**
 * Создаёт или обновляет диалог в локальной базе.
 *
 * @param chat Диалог, который нужно сохранить.
 * @returns Промис без значения после завершения записи.
 */
export async function saveChat(chat: Chat): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO chats (id, title, peerDeviceId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?);`,
    [chat.id, chat.title, chat.peerDeviceId, chat.createdAt, chat.updatedAt],
  );
}

/**
 * Возвращает все диалоги пользователя из локальной базы.
 *
 * @returns Список диалогов, отсортированный по времени последнего обновления.
 */
export async function getChats(): Promise<Chat[]> {
  const db = await getDatabase();

  return db.getAllAsync<Chat>(
    'SELECT * FROM chats ORDER BY updatedAt DESC;',
  );
}

/**
 * Сохраняет сообщение в локальную SQLite-базу.
 *
 * @param message Сообщение, которое нужно добавить или заменить.
 * @returns Промис без значения после записи сообщения.
 */
export async function saveMessage(message: Message): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO messages (
      id, chatId, sender, recipient, text, type, timestamp, isOutgoing,
      fileUri, base64Payload, mimeType, duration, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      message.id,
      message.chatId,
      message.from,
      message.to,
      message.text ?? null,
      message.type,
      message.timestamp,
      message.isOutgoing ? 1 : 0,
      message.fileUri ?? null,
      message.base64Payload ?? null,
      message.mimeType ?? null,
      message.duration ?? null,
      message.status,
    ],
  );
}

/**
 * Получает историю сообщений конкретного диалога.
 *
 * @param chatId Идентификатор диалога, историю которого нужно загрузить.
 * @returns Список сообщений по возрастанию времени отправки.
 */
export async function getMessages(chatId: string): Promise<Message[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC;',
    [chatId],
  );

  return rows.map((row) => ({
    id: row.id,
    chatId: row.chatId,
    from: row.sender,
    to: row.recipient,
    text: row.text ?? undefined,
    type: row.type,
    timestamp: row.timestamp,
    isOutgoing: Boolean(row.isOutgoing),
    fileUri: row.fileUri ?? undefined,
    base64Payload: row.base64Payload ?? undefined,
    mimeType: row.mimeType ?? undefined,
    duration: row.duration ?? undefined,
    status: row.status,
  }));
}

/**
 * Удаляет сообщение из локальной базы.
 *
 * @param id Идентификатор сообщения, которое нужно удалить.
 * @returns Промис без значения после удаления записи.
 */
export async function deleteMessage(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM messages WHERE id = ?;', [id]);
}
