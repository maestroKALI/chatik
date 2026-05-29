import 'react-native-get-random-values';

import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';

const PUBLIC_KEY_STORAGE_KEY = 'messenger.e2ee.publicKey';
const SECRET_KEY_STORAGE_KEY = 'messenger.e2ee.secretKey';

export interface E2EEKeyPair {
  publicKey: string;
  secretKey: string;
}

/**
 * Генерирует пару ключей NaCl Box и сохраняет приватный ключ в SecureStore.
 *
 * Приватный ключ никогда не отправляется на сервер. Сервер получает только
 * publicKey, который нужен другим пользователям для шифрования сообщений.
 *
 * @returns Публичный и приватный ключи в base64.
 */
export async function generateAndStoreKeyPair(): Promise<E2EEKeyPair> {
  const keyPair = nacl.box.keyPair();
  const publicKey = encodeBase64(keyPair.publicKey);
  const secretKey = encodeBase64(keyPair.secretKey);

  await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, publicKey);
  await SecureStore.setItemAsync(SECRET_KEY_STORAGE_KEY, secretKey);

  return { publicKey, secretKey };
}

/**
 * Возвращает существующую пару ключей или создаёт новую.
 *
 * @returns Пара ключей в base64, где приватный ключ остаётся только локально.
 */
export async function getOrCreateKeyPair(): Promise<E2EEKeyPair> {
  const publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
  const secretKey = await SecureStore.getItemAsync(SECRET_KEY_STORAGE_KEY);

  if (publicKey && secretKey) {
    return { publicKey, secretKey };
  }

  return generateAndStoreKeyPair();
}

/**
 * Возвращает локальный публичный ключ устройства.
 *
 * @returns Base64-публичный ключ или null, если ключи ещё не созданы.
 */
export async function getLocalPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
}

/**
 * Шифрует текст для получателя через TweetNaCl box.
 *
 * @param plainText Исходный текст сообщения.
 * @param recipientPublicKey Base64-публичный ключ получателя.
 * @returns Payload формата `nonce.cipherText`, безопасный для отправки через сервер.
 */
export async function encryptTextMessage(plainText: string, recipientPublicKey: string): Promise<string> {
  const { secretKey } = await getOrCreateKeyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encryptedMessage = nacl.box(
    decodeUTF8(plainText),
    nonce,
    decodeBase64(recipientPublicKey),
    decodeBase64(secretKey),
  );

  return `${encodeBase64(nonce)}.${encodeBase64(encryptedMessage)}`;
}

/**
 * Расшифровывает текстовое сообщение от отправителя.
 *
 * @param payload Payload формата `nonce.cipherText`.
 * @param senderPublicKey Base64-публичный ключ отправителя.
 * @returns Расшифрованный текст или null, если проверка аутентичности не прошла.
 */
export async function decryptTextMessage(payload: string, senderPublicKey: string): Promise<string | null> {
  const { secretKey } = await getOrCreateKeyPair();
  const [nonceBase64, encryptedBase64] = payload.split('.');

  if (!nonceBase64 || !encryptedBase64) {
    return null;
  }

  const decrypted = nacl.box.open(
    decodeBase64(encryptedBase64),
    decodeBase64(nonceBase64),
    decodeBase64(senderPublicKey),
    decodeBase64(secretKey),
  );

  return decrypted ? encodeUTF8(decrypted) : null;
}
