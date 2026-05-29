import 'react-native-get-random-values';

import { createId as createCuid2 } from '@paralleldrive/cuid2';

/**
 * Создаёт криптостойкий идентификатор на базе cuid2.
 *
 * cuid2 рассчитан на защиту от перебора и коллизий. Необязательный префикс
 * оставлен только для читаемости локальной БД; случайная часть остаётся cuid2.
 *
 * @param prefix Префикс сущности, например `msg` или `device`.
 * @returns Идентификатор с безопасной случайной частью.
 */
export function createId(prefix?: string): string {
  const id = createCuid2();
  return prefix ? `${prefix}_${id}` : id;
}
