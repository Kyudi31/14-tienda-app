import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppTheme } from '@/constants/theme';

interface ManualBarcodeInputModalProps {
  visible: boolean;
  codigoManual: string;
  errorMensaje: string | null;
  onCodigoChange: (texto: string) => void;
  onBuscar: () => void;
  onCerrar: () => void;
  theme: AppTheme;
}

export function ManualBarcodeInputModal({
  visible,
  codigoManual,
  errorMensaje,
  onCodigoChange,
  onBuscar,
  onCerrar,
  theme,
}: ManualBarcodeInputModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}>
      <View style={styles.modalFondo}>
        <View style={[styles.modalContenido, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitulo, { color: theme.text }]}>
            Entrada manual de código
          </Text>
          <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
            Digita los dígitos del código de barras (ej. 7701234567890 o prod-1).
          </Text>

          <TextInput
            style={[
              styles.modalInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
            placeholder="Número de código de barras..."
            placeholderTextColor={theme.textSecondary}
            value={codigoManual}
            onChangeText={onCodigoChange}
            keyboardType="numeric"
            autoFocus
            accessibilityLabel="Campo para ingresar código de barras numérico"
            accessibilityRole="none"
          />

          {errorMensaje && (
            <Text style={[styles.errorTexto, { color: theme.danger }]}>
              {errorMensaje}
            </Text>
          )}

          <View style={styles.modalBotones}>
            <Pressable
              style={[styles.modalBtnSecundario, { backgroundColor: theme.backgroundElement }]}
              onPress={onCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cancelar entrada manual">
              <Text style={[styles.modalBtnSecTexto, { color: theme.text }]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modalBtnPrimario, { backgroundColor: theme.tint }]}
              onPress={onBuscar}
              accessibilityRole="button"
              accessibilityLabel="Buscar producto con el código digitado">
              <Text style={styles.modalBtnPrimTexto}>Buscar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContenido: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  errorTexto: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalBtnSecundario: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnSecTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnPrimario: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnPrimTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
