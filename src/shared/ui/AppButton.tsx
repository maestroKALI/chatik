import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

interface AppButtonProps extends PressableProps {
  title: string;
}

/**
 * Переиспользуемая кнопка приложения.
 *
 * @param props.title Текст кнопки.
 * @param props Остальные свойства Pressable, например `onPress`.
 * @returns Стилизованная кнопка в тёмной теме приложения.
 */
export function AppButton({ title, style, ...props }: AppButtonProps) {
  return (
    <Pressable style={[styles.button, typeof style === 'function' ? undefined : style]} {...props}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: 14,
  },
  text: {
    color: '#0B0B0B',
    fontWeight: '800',
  },
});
