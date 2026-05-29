import { Tabs } from 'expo-router';

/**
 * Layout основной части приложения.
 *
 * Создаёт нижние вкладки для чата, звонков и будущих функций. Пока wallet и
 * channels являются заглушками, но вынесены в отдельные маршруты для будущего MVP+.
 *
 * @returns Навигация вкладок Expo Router.
 */
export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#F5F5F5',
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: '#A3A3A3',
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#2C2C2C' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Chat', tabBarLabel: 'Чат' }} />
      <Tabs.Screen name="calls" options={{ title: 'Calls', tabBarLabel: 'Звонки' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarLabel: 'Кошелёк' }} />
      <Tabs.Screen name="channels" options={{ title: 'Channels', tabBarLabel: 'Каналы' }} />
    </Tabs>
  );
}
