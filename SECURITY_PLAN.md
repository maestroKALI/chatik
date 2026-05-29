# Security And Identity Plan

## MVP

- Регистрация: телефон, пароль, e-mail и OTP-заглушка.
- OTP: сервер генерирует код, пишет его в лог и возвращает клиенту только вне `production`.
- Пароли: сервер хранит только bcrypt-хеши.
- Сессии: клиент получает bearer token, сервер хранит только SHA-256 хеш токена.
- Rate limiting: auth, OTP и search endpoint'ы защищены `express-rate-limit`.
- Пользователи: сервер хранит `phone -> deviceId`, чтобы повторная регистрация с тем же телефоном и тем же deviceId восстанавливала профиль.
- Поиск: `/api/users/search?phone=...` возвращает только публичные данные пользователя и public key.
- E2EE: приватный ключ хранится в `expo-secure-store`, публичный ключ отправляется на сервер.
- Сообщения: текст шифруется на клиенте через TweetNaCl `box`, сервер видит только ciphertext.
- ID: клиентские ID сообщений/файлов генерируются через `@paralleldrive/cuid2`.

## Production Hardening

- Заменить OTP-заглушку на SendGrid, AWS SES, Magic Link или OAuth 2.0 e-mail verification.
- Перевести rate limiting на Redis store, если будет больше одного VPS/инстанса.
- Включить HTTPS и проксирование WebSocket через Nginx/Caddy.
- Добавить refresh tokens, device sessions и revoke endpoint.
- Добавить аудит входов и уведомления о новом устройстве.
- Рассмотреть `react-native-libsignal-client` или Signal Protocol для PFS и ratcheting.
- Добавить ротацию ключей и recovery-сценарий для утерянного устройства.
- Для файлов добавить WebRTC Data Channel или отдельное временное хранилище с клиентским шифрованием до загрузки.
