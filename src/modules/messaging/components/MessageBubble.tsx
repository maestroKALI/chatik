import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatMessageTime } from '@/shared/lib/formatMessageTime';
import type { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Отображает одно сообщение в виде пузыря чата.
 *
 * @param props.message Сообщение, которое нужно показать пользователю.
 * @returns React-элемент с текстом, изображением или описанием медиа.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const containerStyle = useMemo(
    () => [styles.bubble, message.isOutgoing ? styles.outgoing : styles.incoming],
    [message.isOutgoing],
  );

  return (
    <View style={[styles.row, message.isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}>
      <View style={containerStyle}>
        {message.type === 'image' && message.fileUri ? (
          <Image source={{ uri: message.fileUri }} style={styles.image} />
        ) : null}
        {message.type === 'voice' ? <Text style={styles.text}>Голосовое сообщение</Text> : null}
        {message.type === 'video' ? <View style={styles.videoCircle}><Text style={styles.text}>Видео</Text></View> : null}
        {message.type === 'file' ? <Text style={styles.text}>Файл в разработке</Text> : null}
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        <Text style={styles.meta}>{formatMessageTime(message.timestamp)} · {message.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 10,
  },
  incoming: {
    backgroundColor: '#3A3A3A',
  },
  outgoing: {
    backgroundColor: '#34C759',
  },
  text: {
    color: '#F5F5F5',
    fontSize: 16,
    lineHeight: 21,
  },
  meta: {
    color: 'rgba(245,245,245,0.72)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  image: {
    width: 220,
    height: 180,
    borderRadius: 14,
    marginBottom: 6,
  },
  videoCircle: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 70,
    height: 140,
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    width: 140,
  },
});
