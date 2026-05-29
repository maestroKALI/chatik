import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { login, startRegistration, verifyRegistration } from '@/modules/auth/api';
import { getOrCreateIdentity, saveAuthSession } from '@/modules/auth/identity';
import { getOrCreateKeyPair } from '@/modules/e2ee/crypto';

type AuthMode = 'register' | 'login';

/**
 * Экран регистрации и входа.
 *
 * Регистрация использует телефон, пароль и e-mail. Подтверждение e-mail в MVP
 * работает как OTP-заглушка: сервер возвращает код, а пользователь вводит его
 * вручную, чтобы проверить весь процесс до подключения SendGrid/AWS SES.
 *
 * @returns Экран авторизации с регистрацией, логином и OTP-подтверждением.
 */
export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('register');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  /**
   * Запускает регистрацию и показывает OTP-код заглушки.
   *
   * @returns Промис без значения после создания challenge на сервере.
   */
  async function handleStartRegistration(): Promise<void> {
    try {
      setIsLoading(true);
      const identity = await getOrCreateIdentity();
      const keyPair = await getOrCreateKeyPair();
      const result = await startRegistration({
        phone,
        email,
        password,
        displayName: displayName || phone,
        deviceId: identity.deviceId,
        publicKey: keyPair.publicKey,
      });

      setChallengeId(result.challengeId);
      setDevOtpCode(result.devOtpCode ?? '');
      Alert.alert('OTP-код для MVP', result.devOtpCode ? `Введите код: ${result.devOtpCode}` : 'Код отправлен на e-mail.');
    } catch (error) {
      Alert.alert('Ошибка регистрации', error instanceof Error ? error.message : 'Не удалось начать регистрацию.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Подтверждает OTP и сохраняет авторизованную сессию.
   *
   * @returns Промис без значения после сохранения session token и профиля.
   */
  async function handleVerifyRegistration(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await verifyRegistration(challengeId, otpCode);

      await saveAuthSession({
        userId: result.user.id,
        displayName: result.user.displayName,
        phone: result.user.phone,
        email: result.user.email,
        publicKey: result.user.publicKey,
        sessionToken: result.session.token,
      });
      router.replace('/(main)');
    } catch (error) {
      Alert.alert('Ошибка OTP', error instanceof Error ? error.message : 'Неверный код подтверждения.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Выполняет вход по телефону и паролю.
   *
   * @returns Промис без значения после сохранения авторизованной сессии.
   */
  async function handleLogin(): Promise<void> {
    try {
      setIsLoading(true);
      const result = await login(phone, password);

      await saveAuthSession({
        userId: result.user.id,
        displayName: result.user.displayName,
        phone: result.user.phone,
        email: result.user.email,
        publicKey: result.user.publicKey,
        sessionToken: result.session.token,
      });
      router.replace('/(main)');
    } catch (error) {
      Alert.alert('Ошибка входа', error instanceof Error ? error.message : 'Проверьте телефон и пароль.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Secure Messenger</Text>
      <Text style={styles.subtitle}>Телефон + пароль + e-mail OTP. Приватный E2EE-ключ хранится только на устройстве.</Text>

      <View style={styles.switchRow}>
        <Pressable onPress={() => setMode('register')} style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]}>
          <Text style={styles.switchText}>Регистрация</Text>
        </Pressable>
        <Pressable onPress={() => setMode('login')} style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}>
          <Text style={styles.switchText}>Вход</Text>
        </Pressable>
      </View>

      {mode === 'register' ? (
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Имя" placeholderTextColor="#8A8A8A" style={styles.input} />
      ) : null}
      <TextInput value={phone} onChangeText={setPhone} placeholder="Телефон" placeholderTextColor="#8A8A8A" keyboardType="phone-pad" style={styles.input} />
      {mode === 'register' ? (
        <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor="#8A8A8A" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
      ) : null}
      <TextInput value={password} onChangeText={setPassword} placeholder="Пароль минимум 8 символов" placeholderTextColor="#8A8A8A" secureTextEntry style={styles.input} />

      {mode === 'register' && challengeId ? (
        <>
          <Text style={styles.otpHint}>MVP OTP: {devOtpCode || 'смотрите лог сервера'}</Text>
          <TextInput value={otpCode} onChangeText={setOtpCode} placeholder="OTP-код" placeholderTextColor="#8A8A8A" keyboardType="number-pad" style={styles.input} />
        </>
      ) : null}

      <Pressable
        disabled={isLoading}
        onPress={() => void (mode === 'login' ? handleLogin() : challengeId ? handleVerifyRegistration() : handleStartRegistration())}
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{mode === 'login' ? 'Войти' : challengeId ? 'Подтвердить e-mail' : 'Получить OTP'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 22,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  switchButton: {
    backgroundColor: '#2C2C2C',
    borderRadius: 14,
    flex: 1,
    padding: 12,
  },
  switchButtonActive: {
    backgroundColor: '#34C759',
  },
  switchText: {
    color: '#F5F5F5',
    fontWeight: '800',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    color: '#F5F5F5',
    fontSize: 16,
    marginBottom: 12,
    padding: 16,
  },
  otpHint: {
    color: '#34C759',
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0B0B0B',
    fontSize: 16,
    fontWeight: '800',
  },
});
