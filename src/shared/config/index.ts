import Constants from 'expo-constants';

/**
 * Возвращает адрес Socket.IO-сервера.
 *
 * Функция сначала читает `EXPO_PUBLIC_SOCKET_URL`, потому что это самый удобный
 * способ менять сервер без пересборки кода. Если переменная не задана, берётся
 * значение из `app.json`, а затем локальный адрес по умолчанию.
 *
 * @returns Строковый URL сервера ретрансляции сообщений.
 */
export function getSocketUrl(): string {
  return (
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    (Constants.expoConfig?.extra?.socketUrl as string | undefined) ||
    'http://localhost:3000'
  );
}

export const SELF_CHAT_ID = 'self-chat';
export const MEDIA_SIZE_LIMIT_BYTES = 3 * 1024 * 1024;
