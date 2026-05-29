import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getOrCreateIdentity } from '@/modules/auth/identity';

/**
 * Стартовый экран-маршрутизатор.
 *
 * Экран проверяет, есть ли локальное имя пользователя, и отправляет человека
 * либо на простую авторизацию, либо в основную часть приложения.
 *
 * @returns Индикатор загрузки во время чтения AsyncStorage.
 */
export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    async function routeByIdentity(): Promise<void> {
      const identity = await getOrCreateIdentity();
      router.replace(identity.displayName && identity.sessionToken ? '/(main)' : '/(auth)');
    }

    void routeByIdentity();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#34C759" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    flex: 1,
    justifyContent: 'center',
  },
});
