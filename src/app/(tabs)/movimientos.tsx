import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { MovementCard } from '@/components/movimientos/MovementCard';
import { MovementFilterTabs, FiltroTipo } from '@/components/movimientos/MovementFilterTabs';
import { MovementMetrics } from '@/components/movimientos/MovementMetrics';
import { Colors } from '@/constants/theme';
import { getMovimientosAsync } from '@/services/inventario';
import type { MovimientoStock } from '@/types/inventario';

export default function MovimientosScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');
  const [todosMovimientos, setTodosMovimientos] = useState<MovimientoStock[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargarMovimientos = useCallback(async () => {
    try {
      const data = await getMovimientosAsync();
      setTodosMovimientos(data);
    } catch (err) {
      console.error('Error al cargar movimientos desde SQLite:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recargarMovimientos();
    }, [recargarMovimientos])
  );

  const movimientosFiltrados = todosMovimientos.filter((m) => {
    if (filtro === 'TODOS') return true;
    return m.tipo === filtro;
  });

  const totalEntradas = todosMovimientos
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((acc, curr) => acc + curr.cantidad, 0);

  const totalSalidas = todosMovimientos
    .filter((m) => m.tipo === 'SALIDA')
    .reduce((acc, curr) => acc + curr.cantidad, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MovementMetrics
        totalEntradas={totalEntradas}
        totalSalidas={totalSalidas}
        theme={theme}
      />

      <MovementFilterTabs
        filtro={filtro}
        onSelectFiltro={setFiltro}
        theme={theme}
      />

      {cargando && todosMovimientos.length === 0 ? (
        <View style={styles.cargandoCentrado}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.cargandoTexto, { color: theme.textSecondary }]}>
            Cargando historial de movimientos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={movimientosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MovementCard
              item={item}
              onVerProducto={() => router.push(`/producto/${item.productoId}`)}
              theme={theme}
            />
          )}
          contentContainerStyle={styles.listaContenido}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitulo, { color: theme.text }]}>
                No hay movimientos registrados
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Los ajustes de stock y transacciones se reflejarán aquí cronológicamente.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cargandoCentrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  cargandoTexto: {
    fontSize: 14,
    fontWeight: '500',
  },
  listaContenido: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitulo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
});
