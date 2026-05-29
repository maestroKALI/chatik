# Messenger MVP

Собственный кроссплатформенный мессенджер на React Native + Expo. История сообщений хранится только на клиенте в SQLite, сервер выполняет только ретрансляцию онлайн-сообщений и заготовку сигнализации WebRTC.

## Возможности MVP

- Локальная авторизация без сервера: создаётся `deviceId`, пользователь вводит имя.
- Тестовый чат `Saved Messages`: сообщения отправляются самому себе через Socket.IO-сервер.
- SQLite-история сообщений на устройстве.
- Текстовые сообщения.
- Маленькие изображения через base64 по WebSocket.
- Голосовые сообщения через `expo-av`.
- Видеосообщения через системную камеру и отображение как круглый тип сообщения.
- Заглушка документов, кошелька, каналов и видеозвонков.

## Установка

```bash
npm run install:all
```

## Переменные окружения

Создайте клиентский `.env` из примера:

```bash
cp .env.example .env
```

Для локального запуска на эмуляторе можно оставить:

```bash
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```

Для телефона или VPS укажите публичный адрес сервера:

```bash
EXPO_PUBLIC_SOCKET_URL=https://your-domain.example
```

Создайте серверный `server/.env`:

```bash
cp server/.env.example server/.env
```

## Локальный запуск сервера

```bash
npm run server:start
```

Сервер запускается на `http://localhost:3000`. Он не хранит историю сообщений, а только ретранслирует события между онлайн-клиентами.

## Локальный запуск клиента

```bash
npm start
```

Затем откройте проект через Expo Go или эмулятор Android/iOS.

## Быстрый деплой сервера на VPS через pm2

```bash
git clone https://github.com/maestroKALI/chatik.git
cd chatik/server
npm ci --omit=dev
cp .env.example .env
npm install -g pm2
pm2 start index.js --name chatik-relay
pm2 save
pm2 startup
```

После деплоя укажите в клиентском `.env` публичный адрес сервера:

```bash
EXPO_PUBLIC_SOCKET_URL=https://your-domain.example
```

## Быстрый деплой сервера через Docker

```bash
git clone https://github.com/maestroKALI/chatik.git
cd chatik/server
docker build -t chatik-relay .
docker run -d --name chatik-relay --restart unless-stopped -p 3000:3000 --env-file .env chatik-relay
```

Для production обычно ставят Nginx перед контейнером и проксируют WebSocket на `127.0.0.1:3000`.

## Ограничения MVP

- Сервер не хранит историю и не доставляет сообщения офлайн.
- Документы пока не передаются: для крупных файлов нужен WebRTC Data Channel или внешнее временное хранилище.
- `react-native-webrtc` требует custom dev client, поэтому видеозвонки пока показаны как честная заглушка.
- Лимит base64-медиа в клиенте: 3 МБ.

## Комментарии к коду

Все функции снабжены JSDoc-комментариями на русском языке, чтобы владелец проекта мог понимать назначение каждого участка кода.
