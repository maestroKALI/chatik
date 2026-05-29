import { getSocketUrl } from '@/shared/config';
import type { LocalIdentity } from '@/types/identity';

interface PublicUser {
  id: string;
  phone: string;
  email: string;
  deviceId: string;
  displayName: string;
  publicKey: string;
  emailVerified: boolean;
}

interface AuthResponse {
  user: PublicUser;
  session: {
    token: string;
    expiresAt: number;
  };
}

interface StartRegistrationInput {
  phone: string;
  email: string;
  password: string;
  displayName: string;
  deviceId: string;
  publicKey: string;
}

interface StartRegistrationResponse {
  challengeId: string;
  expiresAt: number;
  devOtpCode?: string;
}

/**
 * Выполняет HTTP-запрос к серверному API и проверяет JSON-ответ.
 *
 * @param path Путь API, например `/api/auth/login`.
 * @param options Параметры fetch.
 * @returns Распарсенный JSON-ответ нужного типа.
 */
async function apiRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${getSocketUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'api_error');
  }

  return payload as T;
}

/**
 * Запускает регистрацию и получает OTP-заглушку.
 *
 * @param input Телефон, e-mail, пароль, deviceId и публичный ключ пользователя.
 * @returns Идентификатор challenge и dev-код для ручной проверки MVP.
 */
export function startRegistration(input: StartRegistrationInput): Promise<StartRegistrationResponse> {
  return apiRequest('/api/auth/register/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Подтверждает OTP-код и создаёт серверную сессию.
 *
 * @param challengeId Идентификатор процесса регистрации.
 * @param otpCode Код подтверждения из e-mail-заглушки.
 * @returns Пользователь и bearer-токен сессии.
 */
export function verifyRegistration(challengeId: string, otpCode: string): Promise<AuthResponse> {
  return apiRequest('/api/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, otpCode }),
  });
}

/**
 * Выполняет вход по телефону и паролю.
 *
 * @param phone Номер телефона пользователя.
 * @param password Пароль пользователя.
 * @returns Пользователь и bearer-токен сессии.
 */
export function login(phone: string, password: string): Promise<AuthResponse> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

/**
 * Ищет пользователя по номеру телефона через сервер.
 *
 * @param phone Номер телефона для поиска.
 * @param identity Локальная авторизованная личность с sessionToken.
 * @returns Публичные данные пользователя или null.
 */
export async function searchUserByPhone(phone: string, identity: LocalIdentity): Promise<PublicUser | null> {
  const result = await apiRequest<{ user: PublicUser | null }>(`/api/users/search?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${identity.sessionToken ?? ''}`,
    },
  });

  return result.user;
}

export type { AuthResponse, PublicUser, StartRegistrationResponse };
