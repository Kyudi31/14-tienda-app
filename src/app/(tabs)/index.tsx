import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ProductCard } from '@/components/inventario/ProductCard';
import { ProductStats } from '@/components/inventario/ProductStats';
import { SearchBar } from '@/components/inventario/SearchBar';
import { Colors } from '@/constants/theme';
import { getProductos } from '@/services/inventario';

export default function ProductosScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [busqueda, setBusqueda] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [actualizacion, setActualizacion] = useState(0);

  const recargarProductos = useCallback(() => {
    setActualizacion((v) => v + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      recargarProductos();
    }, [recargarProductos])
  );

  const productos = getProductos();

  const productosFiltrados = productos.filter((prod) => {
    const coincideTexto =
      prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      prod.codigoBarras.includes(busqueda);
    const coincideFiltro = soloBajoStock ? prod.stockActual <= prod.stockMinimo : true;
    return coincideTexto && coincideFiltro;
  });

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

      <FlatList
        data={productosFiltrados}
        extraData={actualizacion}
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

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.tint },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/escaner')}
        accessibilityRole="button"
        accessibilityLabel="Abrir escáner de código de barras para buscar o actualizar producto">
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
