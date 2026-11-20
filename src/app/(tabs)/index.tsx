import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ProductCard } from '@/components/inventario/ProductCard';
import { ProductStats } from '@/components/inventario/ProductStats';
import { SearchBar } from '@/components/inventario/SearchBar';
import { Colors } from '@/constants/theme';
import { buscarProductosAsync, getProductosAsync } from '@/services/inventario';
import type { Producto } from '@/types/inventario';

export default function ProductosScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [busqueda, setBusqueda] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargarProductos = useCallback(async () => {
    try {
      const data = busqueda.trim()
        ? await buscarProductosAsync(busqueda)
        : await getProductosAsync();
      setProductos(data);
    } catch (err) {
      console.error('Error al cargar productos desde SQLite:', err);
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useFocusEffect(
    useCallback(() => {
      recargarProductos();
    }, [recargarProductos])
  );

  useEffect(() => {
    let activo = true;
    const ejecutarBusqueda = async () => {
      try {
        const data = busqueda.trim()
          ? await buscarProductosAsync(busqueda)
          : await getProductosAsync();
        if (activo) {
          setProductos(data);
        }
      } catch (err) {
        console.error('Error al buscar en SQLite:', err);
      }
    };
    ejecutarBusqueda();
    return () => {
      activo = false;
    };
  }, [busqueda]);

  const productosFiltrados = soloBajoStock
    ? productos.filter((prod) => prod.stockActual <= prod.stockMinimo)
    : productos;

  const totalBajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ProductStats
        total={productos.length}
        totalBajoStock={totalBajoStock}
        soloBajoStock={soloBajoStock}
        onToggleBajoStock={() => setSoloBajoStock(!soloBajoStock)}
        theme={theme}
      />

      <SearchBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onLimpiar={() => setBusqueda('')}
        theme={theme}
      />

      {cargando && productos.length === 0 ? (
        <View style={styles.cargandoCentrado}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.cargandoTexto, { color: theme.textSecondary }]}>
            Cargando catálogo local...
          </Text>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => router.push(`/producto/${item.id}`)}
              onStockChange={recargarProductos}
              theme={theme}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No se encontraron productos
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Intenta cambiar los términos de búsqueda o desactiva los filtros.
              </Text>
              {(busqueda.length > 0 || soloBajoStock) && (
                <Pressable
                  style={[styles.resetButton, { backgroundColor: theme.tint }]}
                  onPress={() => {
                    setBusqueda('');
                    setSoloBajoStock(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Restablecer filtros y búsqueda">
                  <Text style={styles.resetButtonText}>Ver todos los productos</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.tint },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/escaner')}
        accessibilityRole="button"
        accessibilityLabel="Abrir escáner de código de barras para buscar o registrar producto">
        <SymbolView
          name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
          size={24}
          tintColor="#ffffff"
        />
        <Text style={styles.fabText}>Escanear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
    gap: 10,
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabPressed: {
    transform: [{ scale: 0.97 }],
  },
  fabText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
