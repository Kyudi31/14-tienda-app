import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { TipoMovimiento } from '@/types/inventario';

export type FiltroTipo = 'TODOS' | TipoMovimiento;

interface MovementFilterTabsProps {
  filtro: FiltroTipo;
  onSelectFiltro: (tipo: FiltroTipo) => void;
  theme: AppTheme;
}

export function MovementFilterTabs({
  filtro,
  onSelectFiltro,
  theme,
}: MovementFilterTabsProps) {
  const opciones: { key: FiltroTipo; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'ENTRADA', label: 'Entradas (+)' },
    { key: 'SALIDA', label: 'Salidas (-)' },
  ];

  return (
    <View style={styles.container}>
      {opciones.map((opcion) => {
        const seleccionado = filtro === opcion.key;
        return (
          <Pressable
            key={opcion.key}
            style={[
              styles.boton,
              {
                backgroundColor: seleccionado ? theme.tint : theme.backgroundElement,
                borderColor: seleccionado ? theme.tint : theme.border,
              },
            ]}
            onPress={() => onSelectFiltro(opcion.key)}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${opcion.label}, ${seleccionado ? 'activo' : 'inactivo'}`}>
            <Text
              style={[
                styles.texto,
                { color: seleccionado ? '#ffffff' : theme.text },
              ]}>
              {opcion.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  boton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  texto: {
    fontSize: 13,
    fontWeight: '600',
  },
});
