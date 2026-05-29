import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Message } from '@/types/message';

import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
}

/**
 * Отображает список сообщений текущего диалога.
 *
 * @param props.messages Сообщения, загруженные из SQLite и Zustand-store.
 * @returns React-элемент со списком сообщений или пустым состоянием.
 */
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Пока нет сообщений</Text>
        <Text style={styles.emptyText}>Отправьте текст, изображение или голосовое самому себе через локальный сервер.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 12,
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
