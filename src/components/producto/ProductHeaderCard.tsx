import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { Producto } from '@/types/inventario';

interface ProductHeaderCardProps {
  producto: Producto;
  bajoStock: boolean;
  theme: AppTheme;
}

export function ProductHeaderCard({
  producto,
  bajoStock,
  theme,
}: ProductHeaderCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nombre, { color: theme.text }]}>
            {producto.nombre}
          </Text>
          <Text style={[styles.categoria, { color: theme.textSecondary }]}>
            {producto.categoria} · Cód: {producto.codigoBarras}
          </Text>
        </View>
        <Text style={[styles.precio, { color: theme.tint }]}>
          ${producto.precio.toLocaleString('es-CO')}
        </Text>
      </View>

      <View style={styles.stockRow}>
        <View style={[styles.stockBox, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>
            Stock Actual
          </Text>
          <Text
            style={[
              styles.stockValor,
              { color: bajoStock ? theme.danger : theme.success },
            ]}>
            {producto.stockActual} {producto.unidadMedida}
          </Text>
        </View>
        <View style={[styles.stockBox, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>
            Mínimo Requerido
          </Text>
          <Text style={[styles.stockValor, { color: theme.text }]}>
            {producto.stockMinimo} {producto.unidadMedida}
          </Text>
        </View>
      </View>

      {bajoStock && (
        <View style={[styles.alerta, { backgroundColor: 'rgba(220,38,38,0.1)' }]}>
          <Text style={[styles.alertaTexto, { color: theme.danger }]}>
            ⚠️ Alerta: El stock actual está en o por debajo del nivel mínimo establecido.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nombre: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoria: {
    fontSize: 13,
    marginTop: 2,
  },
  precio: {
    fontSize: 20,
    fontWeight: '700',
  },
  stockRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  stockBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockValor: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  alerta: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  alertaTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
