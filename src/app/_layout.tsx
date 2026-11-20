import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { Colors } from '@/constants/theme';
import { inicializarBD } from '@/db/database';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignorar si ya se ocultó previamente
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const [dbLista, setDbLista] = useState(false);
  const [errorBD, setErrorBD] = useState<string | null>(null);

  const arrancarBD = useCallback(async () => {
    setErrorBD(null);
    try {
      await inicializarBD();
      setDbLista(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al inicializar la base de datos.';
      setErrorBD(msg);
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    arrancarBD();
  }, [arrancarBD]);

  if (!dbLista) {
    return (
      <View
        style={[styles.pantallaCarga, { backgroundColor: theme.background }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Inicializando base de datos SQLite del inventario">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {errorBD ? (
          <View style={styles.errorContenedor}>
            <Text style={[styles.errorTitulo, { color: theme.danger }]}>
              Error al inicializar la base de datos
            </Text>
            <Text style={[styles.errorTexto, { color: theme.textSecondary }]}>
              {errorBD}
            </Text>
            <Pressable
              style={[styles.botonReintentar, { backgroundColor: theme.tint }]}
              onPress={arrancarBD}
              accessibilityRole="button"
              accessibilityLabel="Reintentar inicialización de la base de datos">
              <Text style={styles.botonReintentarTexto}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cargaContenedor}>
            <ActivityIndicator size="large" color={theme.tint} />
            <Text style={[styles.cargaTexto, { color: theme.textSecondary }]}>
              Iniciando inventario local (Modo Offline)...
            </Text>
          </View>
        )}
      </View>
    );
  }

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
  pantallaCarga: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cargaContenedor: {
    alignItems: 'center',
    gap: 16,
  },
  cargaTexto: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorContenedor: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  errorTitulo: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorTexto: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  botonReintentar: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  botonReintentarTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
