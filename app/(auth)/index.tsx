import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveDisplayName } from '@/modules/auth/identity';

/**
 * Экран локальной авторизации.
 *
 * Пользователь вводит только отображаемое имя. Сервер аккаунты не хранит, а
 * deviceId создаётся локально и используется для онлайн-маршрутизации сообщений.
 *
 * @returns Экран ввода имени пользователя.
 */
export default function AuthScreen() {
  const [name, setName] = useState('');
  const router = useRouter();

  /**
   * Сохраняет имя пользователя и открывает основной интерфейс.
   *
   * @returns Промис без значения после записи имени в AsyncStorage.
   */
  async function handleContinue(): Promise<void> {
    if (!name.trim()) {
      return;
    }

    await saveDisplayName(name);
    router.replace('/(main)');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messenger MVP</Text>
      <Text style={styles.subtitle}>Введите имя. Оно хранится только на этом устройстве.</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ваше имя"
        placeholderTextColor="#8A8A8A"
        style={styles.input}
      />
      <Pressable onPress={() => void handleContinue()} style={styles.button}>
        <Text style={styles.buttonText}>Продолжить</Text>
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
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    color: '#F5F5F5',
    fontSize: 16,
    marginBottom: 16,
    padding: 16,
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
