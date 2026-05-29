import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

import { createId } from '@/shared/lib/createId';
import type { LocalIdentity } from '@/types/identity';

const DEVICE_ID_KEY = 'messenger.deviceId';
const DISPLAY_NAME_KEY = 'messenger.displayName';

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

  if (!deviceId) {
    deviceId = createDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return { deviceId, displayName };
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

/**
 * Удаляет локальные данные авторизации.
 *
 * Функция нужна для отладки и будущего выхода из профиля. Она не удаляет историю
 * сообщений, потому что история хранится отдельно в SQLite.
 *
 * @returns Промис без значения после очистки ключей AsyncStorage.
 */
export async function clearIdentity(): Promise<void> {
  await AsyncStorage.multiRemove([DEVICE_ID_KEY, DISPLAY_NAME_KEY]);
}
