import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';

interface ProductStatsProps {
  total: number;
  totalBajoStock: number;
  soloBajoStock: boolean;
  onToggleBajoStock: () => void;
  theme: AppTheme;
}

export function ProductStats({
  total,
  totalBajoStock,
  soloBajoStock,
  onToggleBajoStock,
  theme,
}: ProductStatsProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.number, { color: theme.text }]}>{total}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Total productos
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.box,
          {
            backgroundColor: soloBajoStock ? theme.danger : theme.backgroundElement,
          },
          pressed && styles.pressed,
        ]}
        onPress={onToggleBajoStock}
        accessibilityRole="button"
        accessibilityLabel={`Filtro bajo stock: ${totalBajoStock} productos. Toca para ${soloBajoStock ? 'mostrar todos' : 'filtrar bajo stock'}`}>
        <Text
          style={[
            styles.number,
            { color: soloBajoStock ? '#ffffff' : theme.danger },
          ]}>
          {totalBajoStock}
        </Text>
        <Text
          style={[
            styles.label,
            { color: soloBajoStock ? '#ffffff' : theme.textSecondary },
          ]}>
          Stock bajo {soloBajoStock ? '(Activo)' : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  box: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  number: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
});
