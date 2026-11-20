import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { TipoMovimiento } from '@/types/inventario';

interface StockAdjustmentFormProps {
  tipo: TipoMovimiento;
  cantidadStr: string;
  motivo: string;
  unidadMedida: string;
  nuevoStockProyectado: number;
  esSalidaInvalida: boolean;
  mensajeEstado: { texto: string; error: boolean } | null;
  onSelectTipo: (tipo: TipoMovimiento) => void;
  onCantidadChange: (texto: string) => void;
  onModificarCantidad: (delta: number) => void;
  onMotivoChange: (texto: string) => void;
  onSubmit: () => void;
  theme: AppTheme;
}

export function StockAdjustmentForm({
  tipo,
  cantidadStr,
  motivo,
  unidadMedida,
  nuevoStockProyectado,
  esSalidaInvalida,
  mensajeEstado,
  onSelectTipo,
  onCantidadChange,
  onModificarCantidad,
  onMotivoChange,
  onSubmit,
  theme,
}: StockAdjustmentFormProps) {
  const cantidad = parseInt(cantidadStr, 10) || 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.titulo, { color: theme.text }]}>
        Ajuste Rápido de Stock
      </Text>

      <View style={styles.tipoRow}>
        <Pressable
          style={[
            styles.btnTipo,
            {
              backgroundColor: tipo === 'ENTRADA' ? theme.success : theme.backgroundElement,
              borderColor: tipo === 'ENTRADA' ? theme.success : theme.border,
            },
          ]}
          onPress={() => onSelectTipo('ENTRADA')}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar tipo de ajuste Entrada de stock">
          <Text style={[styles.btnTipoTexto, { color: tipo === 'ENTRADA' ? '#ffffff' : theme.text }]}>
            + Entrada
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.btnTipo,
            {
              backgroundColor: tipo === 'SALIDA' ? theme.danger : theme.backgroundElement,
              borderColor: tipo === 'SALIDA' ? theme.danger : theme.border,
            },
          ]}
          onPress={() => onSelectTipo('SALIDA')}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar tipo de ajuste Salida de stock">
          <Text style={[styles.btnTipoTexto, { color: tipo === 'SALIDA' ? '#ffffff' : theme.text }]}>
            - Salida
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>
        Cantidad ({unidadMedida})
      </Text>
      <View style={styles.controlesRow}>
        <Pressable
          style={[styles.btnContador, { backgroundColor: theme.backgroundElement }]}
          onPress={() => onModificarCantidad(-1)}
          accessibilityRole="button"
          accessibilityLabel="Disminuir cantidad en 1">
          <Text style={[styles.btnContadorTexto, { color: theme.text }]}>-1</Text>
        </Pressable>

        <TextInput
          style={[
            styles.inputCantidad,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
            },
          ]}
          value={cantidadStr}
          onChangeText={onCantidadChange}
          keyboardType="number-pad"
          accessibilityLabel="Cantidad a ajustar"
        />

        <Pressable
          style={[styles.btnContador, { backgroundColor: theme.backgroundElement }]}
          onPress={() => onModificarCantidad(1)}
          accessibilityRole="button"
          accessibilityLabel="Aumentar cantidad en 1">
          <Text style={[styles.btnContadorTexto, { color: theme.text }]}>+1</Text>
        </Pressable>
        <Pressable
          style={[styles.btnContador, { backgroundColor: theme.backgroundElement }]}
          onPress={() => onModificarCantidad(5)}
          accessibilityRole="button"
          accessibilityLabel="Aumentar cantidad en 5">
          <Text style={[styles.btnContadorTexto, { color: theme.text }]}>+5</Text>
        </Pressable>
      </View>

      <View style={[styles.proyeccionBox, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.proyeccionTexto, { color: theme.textSecondary }]}>
          Stock resultante:{' '}
          <Text
            style={{
              fontWeight: '700',
              color: esSalidaInvalida ? theme.danger : theme.text,
            }}>
            {nuevoStockProyectado} {unidadMedida}
          </Text>
          {esSalidaInvalida && ' (Inválido: no puede ser negativo)'}
        </Text>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>
        Motivo o nota (opcional)
      </Text>
      <TextInput
        style={[
          styles.inputMotivo,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        placeholder="Ej: Venta en mostrador, reposición..."
        placeholderTextColor={theme.textSecondary}
        value={motivo}
        onChangeText={onMotivoChange}
        accessibilityLabel="Motivo o justificación del ajuste"
      />

      {mensajeEstado && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: mensajeEstado.error
                ? 'rgba(220,38,38,0.15)'
                : 'rgba(22,163,74,0.15)',
            },
          ]}>
          <Text
            style={{
              color: mensajeEstado.error ? theme.danger : theme.success,
              fontWeight: '600',
              fontSize: 13,
            }}>
            {mensajeEstado.texto}
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.btnConfirmar,
          {
            backgroundColor: esSalidaInvalida ? theme.tintInactive : theme.tint,
          },
        ]}
        onPress={onSubmit}
        accessibilityRole="button"
        accessibilityLabel="Confirmar ajuste de stock"
        disabled={esSalidaInvalida}>
        <Text style={styles.btnConfirmarTexto}>
          Confirmar Ajuste ({tipo === 'ENTRADA' ? '+' : '-'}{cantidad})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  btnTipo: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnTipoTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  controlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  btnContador: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnContadorTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputCantidad: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  proyeccionBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  proyeccionTexto: {
    fontSize: 13,
  },
  inputMotivo: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  banner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  btnConfirmar: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnConfirmarTexto: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
