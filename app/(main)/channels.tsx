import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Экран-заглушка каналов.
 *
 * @returns Экран с TODO-сообщением для будущих каналов.
 */
export default function ChannelsScreen() {
  /**
   * Показывает пользователю, что каналы пока не входят в MVP.
   *
   * @returns Ничего не возвращает; побочный эффект — системный alert.
   */
  function handlePress(): void {
    Alert.alert('Channels', 'В разработке (TODO).');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Channels</Text>
      <Text style={styles.subtitle}>В разработке (TODO)</Text>
      <Pressable onPress={handlePress} style={styles.button}>
        <Text style={styles.buttonText}>Открыть каналы</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1A1A1A', flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#F5F5F5', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A3A3A3', fontSize: 16, marginBottom: 24 },
  button: { alignItems: 'center', backgroundColor: '#2C2C2C', borderRadius: 16, padding: 16 },
  buttonText: { color: '#F5F5F5', fontWeight: '800' },
});
