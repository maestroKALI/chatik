import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMessagingStore } from '@/modules/messaging/store/useMessagingStore';

import { RecordButton } from './RecordButton';

/**
 * Отображает нижнюю панель ввода сообщения.
 *
 * @returns React-элемент с полем текста, кнопками изображения, файла и записи.
 */
export function ChatInput() {
  const [text, setText] = useState('');
  const sendTextMessage = useMessagingStore((state) => state.sendTextMessage);
  const sendImageMessage = useMessagingStore((state) => state.sendImageMessage);
  const sendMediaMessage = useMessagingStore((state) => state.sendMediaMessage);

  /**
   * Отправляет текст и очищает поле ввода.
   *
   * @returns Промис без значения после передачи текста в store.
   */
  async function handleSendText(): Promise<void> {
    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    setText('');
    await sendTextMessage(nextText);
  }

  /**
   * Показывает заглушку выбора документов.
   *
   * @returns Промис без значения после открытия picker и показа ограничения MVP.
   */
  async function handlePickDocument(): Promise<void> {
    await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    Alert.alert('Файлы в разработке', 'Для крупных файлов нужен WebRTC Data Channel или внешнее хранилище.');
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Pressable onPress={() => void sendImageMessage()} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>Img</Text>
        </Pressable>
        <Pressable onPress={() => void handlePickDocument()} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>File</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение"
          placeholderTextColor="#8A8A8A"
          style={styles.input}
        />
        <Pressable onPress={() => void handleSendText()} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
      <RecordButton
        onVoiceReady={(fileUri, duration) => sendMediaMessage('voice', fileUri, duration)}
        onVideoReady={(fileUri, duration) => sendMediaMessage('video', fileUri, duration)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2C',
    borderTopColor: '#3A3A3A',
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    color: '#F5F5F5',
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  sendButton: {
    backgroundColor: '#34C759',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendText: {
    color: '#0B0B0B',
    fontWeight: '800',
  },
  smallButton: {
    backgroundColor: '#3A3A3A',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '700',
  },
});
