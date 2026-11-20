import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppTheme } from '@/constants/theme';
import { Producto } from '@/types/inventario';

interface ManualBarcodeInputModalProps {
  visible: boolean;
  busquedaTexto: string;
  errorMensaje?: string | null;
  resultados: Producto[];
  busquedaRealizada: boolean;
  onTextoChange: (texto: string) => void;
  onBuscar: () => void;
  onSeleccionarProducto: (producto: Producto) => void;
  onDarDeAlta: (termino: string) => void;
  onCerrar: () => void;
  theme: AppTheme;
}

export function ManualBarcodeInputModal({
  visible,
  busquedaTexto,
  errorMensaje,
  resultados,
  busquedaRealizada,
  onTextoChange,
  onBuscar,
  onSeleccionarProducto,
  onDarDeAlta,
  onCerrar,
  theme,
}: ManualBarcodeInputModalProps) {
  const sinResultados = busquedaRealizada && resultados.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.modalFondo}>
        <View style={[styles.modalContenido, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitulo, { color: theme.text }]}>Búsqueda manual o alta</Text>
            <Pressable
              onPress={onCerrar}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de búsqueda">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                size={22}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
            Digita el código de barras o el nombre del producto para buscar o registrar.
          </Text>

          <View style={styles.inputFila}>
            <TextInput
              style={[
                styles.modalInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Código o nombre..."
              placeholderTextColor={theme.textSecondary}
              value={busquedaTexto}
              onChangeText={onTextoChange}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={onBuscar}
              accessibilityLabel="Campo para ingresar código de barras o nombre"
            />
            <Pressable
              style={[styles.botonBuscar, { backgroundColor: theme.tint }]}
              onPress={onBuscar}
              accessibilityRole="button"
              accessibilityLabel="Ejecutar búsqueda">
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={18}
                tintColor="#ffffff"
              />
            </Pressable>
          </View>

          {errorMensaje && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errorMensaje}</Text>}

          {resultados.length > 0 && (
            <View style={styles.resultadosContenedor}>
              <Text style={[styles.resultadosTitulo, { color: theme.textSecondary }]}>
                Resultados ({resultados.length}):
              </Text>
              <FlatList
                data={resultados}
                keyExtractor={(item) => item.id}
                style={styles.listaResultados}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.itemResultado,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                    onPress={() => onSeleccionarProducto(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar producto ${item.nombre}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemNombre, { color: theme.text }]}>{item.nombre}</Text>
                      <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                        Cód: {item.codigoBarras} · Stock: {item.stockActual}
                      </Text>
                    </View>
                    <Text style={[styles.itemPrecio, { color: theme.tint }]}>
                      ${item.precio.toLocaleString('es-CO')}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          {sinResultados && (
            <View style={[styles.sinCoincidencias, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.sinCoincidenciasTexto, { color: theme.textSecondary }]}>
                No se encontró producto con &quot;{busquedaTexto.trim()}&quot;.
              </Text>
              <Pressable
                style={[styles.botonAltaDirecta, { backgroundColor: theme.tint }]}
                onPress={() => onDarDeAlta(busquedaTexto)}
                accessibilityRole="button"
                accessibilityLabel="Dar de alta nuevo producto con este término">
                <Text style={styles.botonAltaTexto}>Dar de alta este producto ›</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.modalBotones}>
            <Pressable
              style={[styles.modalBtnSecundario, { backgroundColor: theme.backgroundElement }]}
              onPress={() => onDarDeAlta(busquedaTexto)}
              accessibilityRole="button"
              accessibilityLabel="Registrar un nuevo producto">
              <Text style={[styles.modalBtnSecTexto, { color: theme.text }]}>+ Nuevo Producto</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtnCerrar, { backgroundColor: theme.border }]}
              onPress={onCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal">
              <Text style={[styles.modalBtnCerrarTexto, { color: theme.text }]}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContenido: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { fontSize: 18, fontWeight: '700' },
  modalDesc: { fontSize: 13, marginTop: 6, marginBottom: 14 },
  inputFila: { flexDirection: 'row', gap: 8 },
  modalInput: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  botonBuscar: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  errorTexto: { fontSize: 13, marginTop: 8, fontWeight: '500' },
  resultadosContenedor: { marginTop: 14, maxHeight: 180 },
  resultadosTitulo: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  listaResultados: { flexGrow: 0 },
  itemResultado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  itemNombre: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemPrecio: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  sinCoincidencias: { marginTop: 14, padding: 14, borderRadius: 10, alignItems: 'center' },
  sinCoincidenciasTexto: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  botonAltaDirecta: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  botonAltaTexto: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  modalBtnSecundario: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnSecTexto: { fontSize: 14, fontWeight: '600' },
  modalBtnCerrar: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  modalBtnCerrarTexto: { fontSize: 14, fontWeight: '600' },
});
