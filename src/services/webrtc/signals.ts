import type { RelayPayload } from '@/types/message';

/**
 * Формирует событие сигнализации для будущего WebRTC-звонка.
 *
 * Сейчас модуль используется как типизированная заготовка: реальный WebRTC
 * требует custom dev client, поэтому в первом MVP экран звонков остаётся
 * заглушкой. Наличие функции фиксирует будущий контракт с Socket.IO-сервером.
 *
 * @param type Тип события сигнализации.
 * @param from DeviceId вызывающего пользователя.
 * @param to DeviceId получателя вызова.
 * @param payload Данные WebRTC offer/answer/candidate.
 * @returns Объект события, готовый к отправке через Socket.IO.
 */
export function createCallSignal(type: string, from: string, to: string, payload: unknown) {
  return { type, from, to, payload, timestamp: Date.now() };
}

/**
 * Проверяет, можно ли в текущей сборке запускать WebRTC.
 *
 * @returns `false` для Expo Go; после перехода на custom dev client значение можно заменить.
 */
export function canUseNativeWebRTC(): boolean {
  return false;
}

export type IncomingRelayMessage = RelayPayload;
