import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { Producto } from '@/types/inventario';

interface ScannedProductCardProps {
  producto: Producto;
  onVerDetalle: () => void;
  theme: AppTheme;
}

export function ScannedProductCard({
  producto,
  onVerDetalle,
  theme,
}: ScannedProductCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.titulo, { color: theme.text }]}>
            {producto.nombre}
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            Cód: {producto.codigoBarras} · Stock: {producto.stockActual} {producto.unidadMedida}
          </Text>
        </View>
        <Text style={[styles.precio, { color: theme.tint }]}>
          ${producto.precio.toLocaleString('es-CO')}
        </Text>
      </View>
      <Pressable
        style={[styles.boton, { backgroundColor: theme.tint }]}
        onPress={onVerDetalle}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle y ajustar stock de ${producto.nombre}`}>
        <Text style={styles.botonTexto}>Ver Detalle y Ajustar Stock ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  precio: {
    fontSize: 18,
    fontWeight: '700',
  },
  boton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
