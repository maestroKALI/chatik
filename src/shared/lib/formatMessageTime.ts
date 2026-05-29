/**
 * Форматирует время сообщения для списка чата.
 *
 * @param timestamp Время в миллисекундах Unix epoch.
 * @returns Короткая строка времени в формате текущей локали устройства.
 */
export function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
