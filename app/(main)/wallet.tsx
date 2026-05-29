import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Экран-заглушка кошелька.
 *
 * @returns Экран с TODO-сообщением для будущей финансовой функции.
 */
export default function WalletScreen() {
  /**
   * Показывает пользователю, что кошелёк пока не входит в MVP.
   *
   * @returns Ничего не возвращает; побочный эффект — системный alert.
   */
  function handlePress(): void {
    Alert.alert('Wallet', 'В разработке (TODO).');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.subtitle}>В разработке (TODO)</Text>
      <Pressable onPress={handlePress} style={styles.button}>
        <Text style={styles.buttonText}>Открыть кошелёк</Text>
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
