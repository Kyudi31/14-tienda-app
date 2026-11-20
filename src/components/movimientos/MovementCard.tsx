import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { MovimientoStock } from '@/types/inventario';

interface MovementCardProps {
  item: MovimientoStock;
  onVerProducto: () => void;
  theme: AppTheme;
}

export function MovementCard({ item, onVerProducto, theme }: MovementCardProps) {
  const esEntrada = item.tipo === 'ENTRADA';
  const colorTipo = esEntrada ? theme.success : theme.danger;
  const signo = esEntrada ? '+' : '-';

  const formatearFecha = (fechaIso: string): string => {
    try {
      const fecha = new Date(fechaIso);
      return fecha.toLocaleString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaIso;
    }
  };

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessibilityRole="summary"
      accessibilityLabel={`Movimiento ${item.tipo} de ${item.cantidad} unidades para ${item.productoNombre}. Motivo: ${item.motivo}. Fecha: ${formatearFecha(item.fecha)}`}>
      <View style={styles.header}>
        <View style={styles.tipoRow}>
          <View
            style={[
              styles.badgeTipo,
              { backgroundColor: esEntrada ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)' },
            ]}>
            <Text style={[styles.badgeTipoTexto, { color: colorTipo }]}>
              {item.tipo}
            </Text>
          </View>
          <Text style={[styles.fecha, { color: theme.textSecondary }]}>
            {formatearFecha(item.fecha)}
          </Text>
        </View>
        <Text style={[styles.cantidad, { color: colorTipo }]}>
          {signo}{item.cantidad} u.
        </Text>
      </View>

      <Text style={[styles.nombre, { color: theme.text }]}>
        {item.productoNombre}
      </Text>

      <Text style={[styles.motivo, { color: theme.textSecondary }]}>
        Motivo: {item.motivo}
      </Text>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.stockTransicion, { color: theme.textSecondary }]}>
          Stock: {item.stockAnterior} →{' '}
          <Text style={{ color: theme.text, fontWeight: '700' }}>
            {item.stockNuevo}
          </Text>
        </Text>

        <Pressable
          style={[styles.botonVer, { backgroundColor: theme.backgroundElement }]}
          onPress={onVerProducto}
          accessibilityRole="button"
          accessibilityLabel={`Ver producto ${item.productoNombre}`}>
          <Text style={[styles.botonVerTexto, { color: theme.tint }]}>
            Ver producto ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeTipo: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTipoTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  fecha: {
    fontSize: 12,
  },
  cantidad: {
    fontSize: 16,
    fontWeight: '700',
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  motivo: {
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stockTransicion: {
    fontSize: 13,
  },
  botonVer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  botonVerTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
