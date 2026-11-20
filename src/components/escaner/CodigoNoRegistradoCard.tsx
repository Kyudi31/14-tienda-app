import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppTheme } from '@/constants/theme';

interface CodigoNoRegistradoCardProps {
  codigo: string;
  onRegistrar: () => void;
  onDescartar: () => void;
  theme: AppTheme;
}

export function CodigoNoRegistradoCard({
  codigo,
  onRegistrar,
  onDescartar,
  theme,
}: CodigoNoRegistradoCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.warning,
        },
      ]}>
      <View style={styles.header}>
        <SymbolView
          name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
          size={32}
          tintColor={theme.warning}
        />
        <View style={styles.textoContenedor}>
          <Text style={[styles.titulo, { color: theme.text }]}>
            Código no registrado
          </Text>
          <Text style={[styles.codigoTexto, { color: theme.textSecondary }]}>
            Código: <Text style={[styles.codigoResaltado, { color: theme.tint }]}>{codigo}</Text>
          </Text>
        </View>
      </View>

      <Text style={[styles.descripcion, { color: theme.textSecondary }]}>
        Este producto no existe en el catálogo. ¿Deseas darlo de alta ahora con este código?
      </Text>

      <View style={styles.acciones}>
        <Pressable
          style={[styles.botonSecundario, { backgroundColor: theme.backgroundElement }]}
          onPress={onDescartar}
          accessibilityRole="button"
          accessibilityLabel="Cancelar y escanear otro código">
          <Text style={[styles.botonSecundarioTexto, { color: theme.text }]}>
            Escanear otro
          </Text>
        </Pressable>

        <Pressable
          style={[styles.botonPrimario, { backgroundColor: theme.tint }]}
          onPress={onRegistrar}
          accessibilityRole="button"
          accessibilityLabel={`Registrar nuevo producto con código ${codigo}`}>
          <Text style={styles.botonPrimarioTexto}>Registrar Producto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  textoContenedor: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
  },
  codigoTexto: {
    fontSize: 13,
    marginTop: 2,
  },
  codigoResaltado: {
    fontWeight: '700',
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  acciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  botonSecundario: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  botonSecundarioTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  botonPrimario: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  botonPrimarioTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
