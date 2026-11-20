import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tintInactive,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Productos',
          tabBarLabel: 'Inventario',
          tabBarAccessibilityLabel: 'Pestaña de Inventario y Productos',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' }}
              size={size ?? 24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="escaner"
        options={{
          title: 'Escáner',
          tabBarLabel: 'Escanear',
          tabBarAccessibilityLabel: 'Pestaña de Escáner de código de barras',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
              size={size ?? 24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Historial',
          tabBarLabel: 'Movimientos',
          tabBarAccessibilityLabel: 'Pestaña de Historial de entradas y salidas',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'clock.fill', android: 'history', web: 'history' }}
              size={size ?? 24}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
