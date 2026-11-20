import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignorar si ya se ocultó
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Ignorar fallos no críticos al ocultar splash
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            title: 'Inventario',
          }}
        />
        <Stack.Screen
          name="producto/[id]"
          options={{
            title: 'Detalle de Producto',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="producto/nuevo"
          options={{
            title: 'Nuevo Producto',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
