import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { AppTheme } from '@/constants/theme';

interface UndoBarProps {
  onDeshacer: () => void;
  deshaciendo: boolean;
  theme: AppTheme;
  textoAyuda?: string;
  style?: object;
}

export function UndoBar({
  onDeshacer,
  deshaciendo,
  theme,
  textoAyuda = 'Sacude el móvil o pulsa para deshacer',
  style,
}: UndoBarProps) {
  return (
    <View
      style={[
        styles.deshacerBarra,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}>
      <View style={styles.deshacerInfo}>
        <SymbolView
          name={{ ios: 'iphone.radiowaves.left.and.right', android: 'vibration', web: 'vibration' }}
          size={20}
          tintColor={theme.tint}
        />
        <Text style={[styles.deshacerInfoTexto, { color: theme.textSecondary }]}>
          {textoAyuda}
        </Text>
      </View>

      <Pressable
        style={[
          styles.botonDeshacer,
          { backgroundColor: theme.warning, opacity: deshaciendo ? 0.6 : 1 },
        ]}
        onPress={onDeshacer}
        disabled={deshaciendo}
        accessibilityRole="button"
        accessibilityLabel="Deshacer último movimiento de stock">
        <SymbolView
          name={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}
          size={15}
          tintColor="#ffffff"
        />
        <Text style={styles.botonDeshacerTexto}>
          {deshaciendo ? 'Revirtiendo...' : 'Deshacer'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  deshacerBarra: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deshacerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deshacerInfoTexto: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  botonDeshacer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  botonDeshacerTexto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
