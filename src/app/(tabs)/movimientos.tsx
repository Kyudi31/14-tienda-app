import { useState } from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';

import { MovementCard } from '@/components/movimientos/MovementCard';
import { MovementFilterTabs, FiltroTipo } from '@/components/movimientos/MovementFilterTabs';
import { MovementMetrics } from '@/components/movimientos/MovementMetrics';
import { Colors } from '@/constants/theme';
import { getMovimientos } from '@/services/inventario';

export default function MovimientosScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');

  const todosMovimientos = getMovimientos();

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
