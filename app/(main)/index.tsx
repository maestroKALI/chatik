import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getOrCreateIdentity } from '@/modules/auth/identity';
import { ChatInput } from '@/modules/messaging/components/ChatInput';
import { MessageList } from '@/modules/messaging/components/MessageList';
import { useMessagingStore } from '@/modules/messaging/store/useMessagingStore';

/**
 * Главный экран тестового self-chat.
 *
 * Экран подключает локальную личность, загружает SQLite-историю и регистрирует
 * устройство на Socket.IO-сервере. В MVP сообщения отправляются самому себе.
 *
 * @returns Экран переписки с историей и панелью ввода.
 */
export default function ChatScreen() {
  const messages = useMessagingStore((state) => state.messages);
  const initializeMessaging = useMessagingStore((state) => state.initializeMessaging);
  const identity = useMessagingStore((state) => state.identity);

  useEffect(() => {
    async function bootMessaging(): Promise<void> {
      const nextIdentity = await getOrCreateIdentity();
      await initializeMessaging(nextIdentity);
    }

    void bootMessaging();
  }, [initializeMessaging]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Messages</Text>
        <Text style={styles.subtitle}>Device: {identity?.deviceId ?? 'loading'}</Text>
      </View>
      <MessageList messages={messages} />
      <ChatInput />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    flex: 1,
  },
  header: {
    backgroundColor: '#2C2C2C',
    padding: 14,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 3,
  },
});
