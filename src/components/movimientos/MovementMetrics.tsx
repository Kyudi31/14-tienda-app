import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppTheme } from '@/constants/theme';

interface MovementMetricsProps {
  totalEntradas: number;
  totalSalidas: number;
  theme: AppTheme;
}

export function MovementMetrics({
  totalEntradas,
  totalSalidas,
  theme,
}: MovementMetricsProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: 'arrow.down.circle.fill', android: 'arrow_downward', web: 'arrow_downward' }}
          size={22}
          tintColor={theme.success}
        />
        <View style={styles.textoCol}>
          <Text style={[styles.valor, { color: theme.success }]}>
            +{totalEntradas}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Entradas registradas
          </Text>
        </View>
      </View>

      <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: 'arrow.up.circle.fill', android: 'arrow_upward', web: 'arrow_upward' }}
          size={22}
          tintColor={theme.danger}
        />
        <View style={styles.textoCol}>
          <Text style={[styles.valor, { color: theme.danger }]}>
            -{totalSalidas}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Salidas registradas
          </Text>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  textoCol: {
    flex: 1,
  },
  valor: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
