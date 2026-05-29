import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { canUseNativeWebRTC } from '@/services/webrtc/signals';

/**
 * Экран видеозвонков MVP.
 *
 * Пока обычный Expo Go не поддерживает `react-native-webrtc`, экран показывает
 * честную заглушку. Реальная WebRTC-логика будет включена после перехода на
 * custom dev client.
 *
 * @returns Экран звонков с кнопкой-заглушкой.
 */
export default function CallsScreen() {
  /**
   * Показывает состояние функции видеозвонков.
   *
   * @returns Ничего не возвращает; побочный эффект — системный alert.
   */
  function handleCallPress(): void {
    const message = canUseNativeWebRTC()
      ? 'WebRTC готов к запуску.'
      : 'Видеозвонки в разработке. Для WebRTC нужен custom dev client.';

    Alert.alert('Видеозвонок', message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Видеозвонки</Text>
      <Text style={styles.subtitle}>Сигнализация уже предусмотрена на сервере, нативный WebRTC подключается отдельным шагом.</Text>
      <Pressable onPress={handleCallPress} style={styles.button}>
        <Text style={styles.buttonText}>Видеозвонок в разработке</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: 16,
  },
  buttonText: {
    color: '#0B0B0B',
    fontSize: 16,
    fontWeight: '800',
  },
});
