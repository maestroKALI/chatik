import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchUserByPhone, type PublicUser } from '@/modules/auth/api';
import { getOrCreateIdentity } from '@/modules/auth/identity';

/**
 * Экран поиска пользователей по телефону.
 *
 * Поиск выполняется через серверный endpoint `/api/users/search`, который
 * возвращает только публичные данные: user id, phone, deviceId и publicKey.
 *
 * @returns Экран поиска контакта по номеру телефона.
 */
export default function SearchScreen() {
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Ищет пользователя по введённому номеру телефона.
   *
   * @returns Промис без значения после обновления результата поиска.
   */
  async function handleSearch(): Promise<void> {
    try {
      setIsLoading(true);
      const identity = await getOrCreateIdentity();
      const foundUser = await searchUserByPhone(phone, identity);

      setUser(foundUser);
      if (!foundUser) {
        Alert.alert('Не найдено', 'Пользователь с таким телефоном не зарегистрирован.');
      }
    } catch (error) {
      Alert.alert('Ошибка поиска', error instanceof Error ? error.message : 'Не удалось выполнить поиск.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Поиск пользователя</Text>
      <TextInput value={phone} onChangeText={setPhone} placeholder="Телефон" placeholderTextColor="#8A8A8A" keyboardType="phone-pad" style={styles.input} />
      <Pressable disabled={isLoading} onPress={() => void handleSearch()} style={styles.button}>
        <Text style={styles.buttonText}>Найти</Text>
      </Pressable>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.meta}>Phone: {user.phone}</Text>
          <Text style={styles.meta}>Device: {user.deviceId}</Text>
          <Text style={styles.key} numberOfLines={3}>Public key: {user.publicKey}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    flex: 1,
    padding: 24,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    color: '#F5F5F5',
    fontSize: 16,
    marginBottom: 12,
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
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  name: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: '#A3A3A3',
    marginTop: 8,
  },
  key: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 8,
  },
});
