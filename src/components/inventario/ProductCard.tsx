import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { Producto } from '@/types/inventario';

interface ProductCardProps {
  item: Producto;
  onPress: () => void;
  theme: AppTheme;
}

export function ProductCard({ item, onPress, theme }: ProductCardProps) {
  const bajoStock = item.stockActual <= item.stockMinimo;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: bajoStock ? theme.danger : theme.border,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Producto ${item.nombre}, código ${item.codigoBarras}, precio ${item.precio} pesos, stock actual ${item.stockActual} ${item.unidadMedida}. Toca para ajustar stock.`}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[styles.nombre, { color: theme.text }]}>
            {item.nombre}
          </Text>
          <Text style={[styles.subtexto, { color: theme.textSecondary }]}>
            {item.categoria} · Cód: {item.codigoBarras}
          </Text>
        </View>
        <View
          style={[
            styles.badgeStock,
            {
              backgroundColor: bajoStock ? theme.danger : theme.backgroundElement,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: bajoStock ? '#ffffff' : theme.text },
            ]}>
            {item.stockActual} {item.unidadMedida}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.precio, { color: theme.tint }]}>
          ${item.precio.toLocaleString('es-CO')}
        </Text>
        {bajoStock && (
          <View style={styles.alertaContainer}>
            <Text style={[styles.alertaText, { color: theme.danger }]}>
              ⚠️ Mínimo: {item.stockMinimo}
            </Text>
          </View>
        )}
        <View style={[styles.botonAjustar, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.botonAjustarTexto, { color: theme.text }]}>
            Ajustar stock ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtexto: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeStock: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  precio: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertaContainer: {
    paddingHorizontal: 6,
  },
  alertaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  botonAjustar: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  botonAjustarTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
