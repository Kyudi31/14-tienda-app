import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { MovementCard } from '@/components/movimientos/MovementCard';
import { MovementFilterTabs, FiltroTipo } from '@/components/movimientos/MovementFilterTabs';
import { MovementMetrics } from '@/components/movimientos/MovementMetrics';
import { UndoBar } from '@/components/movimientos/UndoBar';
import { Colors } from '@/constants/theme';
import { useShake } from '@/sensors/useShake';
import { deshacerUltimoMovimientoAsync, getMovimientosAsync } from '@/services/inventario';
import type { MovimientoStock } from '@/types/inventario';

export default function MovimientosScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');
  const [todosMovimientos, setTodosMovimientos] = useState<MovimientoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [bannerMensaje, setBannerMensaje] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

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

  const handleDeshacer = useCallback(async () => {
    if (deshaciendo) return;
    setDeshaciendo(true);
    try {
      const res = await deshacerUltimoMovimientoAsync();
      if (res.exito) {
        setBannerMensaje({ texto: res.mensaje, tipo: 'exito' });
        await recargarMovimientos();
      } else {
        setBannerMensaje({ texto: res.mensaje, tipo: 'error' });
      }
    } catch (err) {
      console.error('Error al deshacer movimiento:', err);
      setBannerMensaje({ texto: 'Error al deshacer el movimiento.', tipo: 'error' });
    } finally {
      setDeshaciendo(false);
    }
  }, [deshaciendo, recargarMovimientos]);

  // Sensor Acelerómetro: Shake para Deshacer
  useShake(handleDeshacer);

  // Auto-cierre del banner tras 4.5 segundos
  useEffect(() => {
    if (!bannerMensaje) return;
    const timer = setTimeout(() => setBannerMensaje(null), 4500);
    return () => clearTimeout(timer);
  }, [bannerMensaje]);

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
      {bannerMensaje && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor:
                bannerMensaje.tipo === 'exito' ? theme.success + '20' : theme.danger + '20',
              borderColor: bannerMensaje.tipo === 'exito' ? theme.success : theme.danger,
            },
          ]}>
          <SymbolView
            name={{
              ios: bannerMensaje.tipo === 'exito' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill',
              android: bannerMensaje.tipo === 'exito' ? 'check_circle' : 'warning',
              web: bannerMensaje.tipo === 'exito' ? 'check_circle' : 'warning',
            }}
            size={18}
            tintColor={bannerMensaje.tipo === 'exito' ? theme.success : theme.danger}
          />
          <Text
            style={[
              styles.bannerTexto,
              { color: bannerMensaje.tipo === 'exito' ? theme.success : theme.danger },
            ]}>
            {bannerMensaje.texto}
          </Text>
        </View>
      )}

      <MovementMetrics
        totalEntradas={totalEntradas}
        totalSalidas={totalSalidas}
        theme={theme}
      />

      <UndoBar
        onDeshacer={handleDeshacer}
        deshaciendo={deshaciendo}
        theme={theme}
        style={styles.undoBarEspacio}
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
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTexto: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  undoBarEspacio: {
    marginHorizontal: 16,
    marginBottom: 8,
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
