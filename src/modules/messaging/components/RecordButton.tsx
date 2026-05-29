import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

interface RecordButtonProps {
  onVoiceReady: (fileUri: string, duration?: number) => Promise<void>;
  onVideoReady: (fileUri: string, duration?: number) => Promise<void>;
}

type RecordingMode = 'voice' | 'video';

/**
 * Управляет записью голосовых сообщений и видеокружочков.
 *
 * @param props.onVoiceReady Колбэк, который получает URI готового аудиофайла.
 * @param props.onVideoReady Колбэк, который получает URI готового видеофайла.
 * @returns Круглая кнопка записи с переключением режима свайпом вверх.
 */
export function RecordButton({ onVoiceReady, onVideoReady }: RecordButtonProps) {
  const [mode, setMode] = useState<RecordingMode>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startedAtRef = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 18,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < -30) {
          setMode('video');
        }
        if (gesture.dy > 30) {
          setMode('voice');
        }
      },
    }),
  ).current;

  /**
   * Запрашивает доступ к микрофону и запускает запись аудио.
   *
   * @returns Промис без значения после старта записи.
   */
  async function startVoiceRecording(): Promise<void> {
    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Для голосового сообщения нужен доступ к микрофону.');
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    startedAtRef.current = Date.now();
    setIsRecording(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /**
   * Останавливает запись аудио и передаёт файл в модуль сообщений.
   *
   * @returns Промис без значения после сохранения голосового сообщения.
   */
  async function stopVoiceRecording(): Promise<void> {
    const recording = recordingRef.current;

    if (!recording) {
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const duration = Date.now() - startedAtRef.current;
    recordingRef.current = null;
    setIsRecording(false);

    if (uri) {
      await onVoiceReady(uri, duration);
    }
  }

  /**
   * Открывает системную камеру для записи короткого видеокружочка.
   *
   * @returns Промис без значения после передачи видео в модуль сообщений.
   */
  async function recordVideoMessage(): Promise<void> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Для видеокружочка нужен доступ к камере.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      await onVideoReady(result.assets[0].uri, result.assets[0].duration ?? undefined);
    }
  }

  /**
   * Обрабатывает долгое нажатие на кнопку записи.
   *
   * @returns Промис без значения после запуска выбранного режима записи.
   */
  async function handleLongPress(): Promise<void> {
    if (mode === 'video') {
      await recordVideoMessage();
      return;
    }

    await startVoiceRecording();
  }

  /**
   * Обрабатывает отпускание кнопки записи.
   *
   * @returns Промис без значения после остановки активной аудиозаписи.
   */
  async function handlePressOut(): Promise<void> {
    if (isRecording) {
      await stopVoiceRecording();
    }
  }

  return (
    <View {...panResponder.panHandlers} style={styles.wrapper}>
      <Pressable
        onLongPress={() => void handleLongPress()}
        onPressOut={() => void handlePressOut()}
        style={[styles.button, isRecording ? styles.recording : null]}
      >
        <Text style={styles.icon}>{mode === 'voice' ? 'Mic' : 'Video'}</Text>
      </Pressable>
      <Text style={styles.hint}>{mode === 'voice' ? 'Удерживайте для голоса' : 'Удерживайте для видео'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#34C759',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  recording: {
    opacity: 0.7,
    transform: [{ scale: 1.08 }],
  },
  icon: {
    color: '#0B0B0B',
    fontSize: 12,
    fontWeight: '800',
  },
  hint: {
    color: '#A3A3A3',
    fontSize: 10,
    marginTop: 4,
  },
});
