import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppTheme } from '@/constants/theme';

interface SearchBarProps {
  busqueda: string;
  onBusquedaChange: (texto: string) => void;
  onLimpiar: () => void;
  theme: AppTheme;
}

export function SearchBar({
  busqueda,
  onBusquedaChange,
  onLimpiar,
  theme,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor={theme.textSecondary}
          value={busqueda}
          onChangeText={onBusquedaChange}
          accessibilityLabel="Buscar productos por nombre o código de barras"
          accessibilityRole="search"
        />
        {busqueda.length > 0 && (
          <Pressable
            onPress={onLimpiar}
            accessibilityRole="button"
            accessibilityLabel="Limpiar campo de búsqueda"
            style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
              ✕
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
