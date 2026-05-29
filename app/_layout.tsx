import 'react-native-gesture-handler';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initDB } from '@/shared/db';

const queryClient = new QueryClient();

/**
 * Корневой layout приложения.
 *
 * Компонент инициализирует SQLite перед показом экранов, подключает TanStack
 * Query для будущих серверных запросов и оборачивает приложение в контейнер
 * жестов, который нужен для кнопки записи сообщений.
 *
 * @returns Навигационный контейнер Expo Router.
 */
export default function RootLayout() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  useEffect(() => {
    void initDB().finally(() => setIsDatabaseReady(true));
  }, []);

  if (!isDatabaseReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#34C759" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    flex: 1,
    justifyContent: 'center',
  },
});
