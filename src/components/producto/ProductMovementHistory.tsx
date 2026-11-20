import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { MovimientoStock } from '@/types/inventario';

interface ProductMovementHistoryProps {
  movimientos: MovimientoStock[];
  theme: AppTheme;
}

export function ProductMovementHistory({
  movimientos,
  theme,
}: ProductMovementHistoryProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.titulo, { color: theme.text }]}>
        Historial de este producto
      </Text>
      {movimientos.length === 0 ? (
        <Text style={[styles.sinHistorial, { color: theme.textSecondary }]}>
          No hay movimientos previos registrados para este producto.
        </Text>
      ) : (
        movimientos.slice(0, 5).map((mov) => (
          <View
            key={mov.id}
            style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.row}>
              <Text
                style={[
                  styles.tipo,
                  { color: mov.tipo === 'ENTRADA' ? theme.success : theme.danger },
                ]}>
                {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad} ({mov.tipo})
              </Text>
              <Text style={[styles.fecha, { color: theme.textSecondary }]}>
                {new Date(mov.fecha).toLocaleDateString('es-CO')}
              </Text>
            </View>
            <Text style={[styles.motivo, { color: theme.textSecondary }]}>
              {mov.motivo} (Stock: {mov.stockAnterior} → {mov.stockNuevo})
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sinHistorial: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  item: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipo: {
    fontSize: 13,
    fontWeight: '700',
  },
  fecha: {
    fontSize: 12,
  },
  motivo: {
    fontSize: 12,
    marginTop: 2,
  },
});
