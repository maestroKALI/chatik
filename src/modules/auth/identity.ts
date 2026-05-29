import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

import { createId } from '@/shared/lib/createId';
import type { LocalIdentity } from '@/types/identity';

const DEVICE_ID_KEY = 'messenger.deviceId';
const DISPLAY_NAME_KEY = 'messenger.displayName';
const PHONE_KEY = 'messenger.phone';
const EMAIL_KEY = 'messenger.email';
const USER_ID_KEY = 'messenger.userId';
const SESSION_TOKEN_KEY = 'messenger.sessionToken';
const PUBLIC_KEY_KEY = 'messenger.publicKey';

/**
 * Создаёт стабильный локальный идентификатор устройства.
 *
 * Функция добавляет к случайному ID информацию о производителе и модели, чтобы
 * владелец проекта мог легче понимать происхождение ID при отладке. ID не
 * является секретом и используется только для маршрутизации сообщений онлайн.
 *
 * @returns Новый строковый deviceId.
 */
function createDeviceId(): string {
  const deviceLabel = [Device.manufacturer, Device.modelName]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();

  return createId(deviceLabel || 'device');
}

/**
 * Загружает локальную личность пользователя или создаёт новую.
 *
 * Функция читает `deviceId` и имя из AsyncStorage. Если deviceId отсутствует,
 * он генерируется и сохраняется. Имя может быть пустым до прохождения экрана
 * локальной авторизации.
 *
 * @returns Объект с deviceId и displayName.
 */
export async function getOrCreateIdentity(): Promise<LocalIdentity> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  const displayName = (await AsyncStorage.getItem(DISPLAY_NAME_KEY)) ?? '';
  const phone = (await AsyncStorage.getItem(PHONE_KEY)) ?? undefined;
  const email = (await AsyncStorage.getItem(EMAIL_KEY)) ?? undefined;
  const userId = (await AsyncStorage.getItem(USER_ID_KEY)) ?? undefined;
  const publicKey = (await AsyncStorage.getItem(PUBLIC_KEY_KEY)) ?? undefined;
  const sessionToken = (await SecureStore.getItemAsync(SESSION_TOKEN_KEY)) ?? undefined;

  if (!deviceId) {
    deviceId = createDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return { deviceId, displayName, phone, email, userId, publicKey, sessionToken };
}

/**
 * Сохраняет отображаемое имя пользователя локально.
 *
 * @param displayName Имя, которое будет показано в интерфейсе приложения.
 * @returns Актуальная локальная личность после сохранения имени.
 */
export async function saveDisplayName(displayName: string): Promise<LocalIdentity> {
  const identity = await getOrCreateIdentity();
  const normalizedName = displayName.trim();

  await AsyncStorage.setItem(DISPLAY_NAME_KEY, normalizedName);

  return { ...identity, displayName: normalizedName };
}

interface AuthSessionInput {
  userId: string;
  displayName: string;
  phone: string;
  email: string;
  publicKey: string;
  sessionToken: string;
}

/**
 * Сохраняет авторизованную сессию пользователя.
 *
 * Токен сессии хранится в SecureStore, а публичные данные профиля — в
 * AsyncStorage. Это снижает риск утечки bearer-токена через обычное хранилище.
 *
 * @param session Данные пользователя и bearer-токен, полученные от сервера.
 * @returns Актуальная локальная личность.
 */
export async function saveAuthSession(session: AuthSessionInput): Promise<LocalIdentity> {
  const identity = await getOrCreateIdentity();

  await AsyncStorage.multiSet([
    [DISPLAY_NAME_KEY, session.displayName],
    [PHONE_KEY, session.phone],
    [EMAIL_KEY, session.email],
    [USER_ID_KEY, session.userId],
    [PUBLIC_KEY_KEY, session.publicKey],
  ]);
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.sessionToken);

  return {
    ...identity,
    displayName: session.displayName,
    phone: session.phone,
    email: session.email,
    userId: session.userId,
    publicKey: session.publicKey,
    sessionToken: session.sessionToken,
  };
}

/**
 * Удаляет локальные данные авторизации.
 *
 * Функция нужна для отладки и будущего выхода из профиля. Она не удаляет историю
 * сообщений, потому что история хранится отдельно в SQLite.
 *
 * @returns Промис без значения после очистки ключей AsyncStorage.
 */
export async function clearIdentity(): Promise<void> {
  await AsyncStorage.multiRemove([DEVICE_ID_KEY, DISPLAY_NAME_KEY, PHONE_KEY, EMAIL_KEY, USER_ID_KEY, PUBLIC_KEY_KEY]);
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
