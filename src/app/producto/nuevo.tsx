import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/theme';
import { crearProductoAsync } from '@/services/inventario';
import type { ErroresFormularioProducto } from '@/types/inventario';

const CATEGORIAS_COMUNES = ['Abarrotes', 'Lácteos', 'Granos', 'Panadería', 'Bebidas', 'Limpieza', 'General'];
const UNIDADES_COMUNES = ['unidad', 'bolsa', 'paquete', 'botella', 'kg', 'cubeta'];

export default function NuevoProductoScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const params = useLocalSearchParams<{ codigo?: string; nombre?: string }>();

  const [codigoBarras, setCodigoBarras] = useState(params.codigo ?? '');
  const [nombre, setNombre] = useState(params.nombre ?? '');
  const [categoria, setCategoria] = useState('Abarrotes');
  const [precioStr, setPrecioStr] = useState('');
  const [stockActualStr, setStockActualStr] = useState('0');
  const [stockMinimoStr, setStockMinimoStr] = useState('3');
  const [unidadMedida, setUnidadMedida] = useState('unidad');
  const [guardando, setGuardando] = useState(false);

  const [errores, setErrores] = useState<ErroresFormularioProducto>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const validarFormulario = (): boolean => {
    const nuevosErrores: ErroresFormularioProducto = {};
    const codLimpio = codigoBarras.trim();
    const nomLimpio = nombre.trim();
    const precioNum = parseFloat(precioStr);
    const stockActualNum = parseInt(stockActualStr, 10);
    const stockMinNum = parseInt(stockMinimoStr, 10);

    if (!nomLimpio) nuevosErrores.nombre = 'El nombre del producto es obligatorio.';
    if (!codLimpio) nuevosErrores.codigoBarras = 'El código de barras es obligatorio.';
    if (precioStr.trim() === '' || isNaN(precioNum) || precioNum < 0) {
      nuevosErrores.precio = 'El precio debe ser un número mayor o igual a 0.';
    }
    if (stockActualStr.trim() === '' || isNaN(stockActualNum) || stockActualNum < 0) {
      nuevosErrores.stockActual = 'El stock inicial debe ser mayor o igual a 0.';
    }
    if (stockMinimoStr.trim() === '' || isNaN(stockMinNum) || stockMinNum < 1) {
      nuevosErrores.stockMinimo = 'El stock mínimo debe ser al menos 1.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = async () => {
    setErrorGeneral(null);
    if (!validarFormulario()) {
      setErrorGeneral('Revisa los campos señalados antes de guardar.');
      return;
    }

    setGuardando(true);
    try {
      const resultado = await crearProductoAsync({
        codigoBarras: codigoBarras.trim(),
        nombre: nombre.trim(),
        categoria,
        precio: parseFloat(precioStr),
        stockActual: parseInt(stockActualStr, 10) || 0,
        stockMinimo: parseInt(stockMinimoStr, 10) || 3,
        unidadMedida,
      });

      if (resultado.exito && resultado.producto) {
        router.replace(`/producto/${resultado.producto.id}`);
      } else {
        setErrorGeneral(resultado.mensaje);
        if (resultado.errores) setErrores(resultado.errores);
      }
    } catch {
      setErrorGeneral('Error inesperado al persistir en SQLite.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.encabezado}>
          <Text style={[styles.titulo, { color: theme.text }]}>Registrar Nuevo Producto</Text>
          <Text style={[styles.subtitulo, { color: theme.textSecondary }]}>
            Ingresa los datos para registrar el producto en la base de datos local SQLite.
          </Text>
        </View>

        {errorGeneral && (
          <View style={[styles.bannerError, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
            <SymbolView name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} size={20} tintColor={theme.danger} />
            <Text style={[styles.bannerErrorTexto, { color: theme.danger }]}>{errorGeneral}</Text>
          </View>
        )}

        <View style={styles.campo}>
          <Text style={[styles.etiqueta, { color: theme.text }]}>Código de barras *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: errores.codigoBarras ? theme.danger : theme.border, backgroundColor: theme.card }]}
            placeholder="Ej. 7701234567890"
            placeholderTextColor={theme.textSecondary}
            value={codigoBarras}
            onChangeText={(txt) => {
              setCodigoBarras(txt);
              if (errores.codigoBarras) setErrores((prev) => ({ ...prev, codigoBarras: undefined }));
            }}
            accessibilityLabel="Código de barras obligatorio y único"
          />
          {errores.codigoBarras && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errores.codigoBarras}</Text>}
        </View>

        <View style={styles.campo}>
          <Text style={[styles.etiqueta, { color: theme.text }]}>Nombre del producto *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: errores.nombre ? theme.danger : theme.border, backgroundColor: theme.card }]}
            placeholder="Ej. Leche Deslactosada 1L"
            placeholderTextColor={theme.textSecondary}
            value={nombre}
            onChangeText={(txt) => {
              setNombre(txt);
              if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: undefined }));
            }}
            accessibilityLabel="Nombre del producto obligatorio"
          />
          {errores.nombre && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errores.nombre}</Text>}
        </View>

        <View style={styles.campo}>
          <Text style={[styles.etiqueta, { color: theme.text }]}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContenedor}>
            {CATEGORIAS_COMUNES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, { backgroundColor: categoria === cat ? theme.tint : theme.card, borderColor: categoria === cat ? theme.tint : theme.border }]}
                onPress={() => setCategoria(cat)}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar categoría ${cat}`}>
                <Text style={[styles.chipTexto, { color: categoria === cat ? '#ffffff' : theme.text }]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.campo}>
          <Text style={[styles.etiqueta, { color: theme.text }]}>Precio ($) *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: errores.precio ? theme.danger : theme.border, backgroundColor: theme.card }]}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={precioStr}
            onChangeText={(txt) => {
              setPrecioStr(txt);
              if (errores.precio) setErrores((prev) => ({ ...prev, precio: undefined }));
            }}
            accessibilityLabel="Precio de venta obligatorio mayor o igual a 0"
          />
          {errores.precio && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errores.precio}</Text>}
        </View>

        <View style={styles.filaCampos}>
          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={[styles.etiqueta, { color: theme.text }]}>Stock inicial *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: errores.stockActual ? theme.danger : theme.border, backgroundColor: theme.card }]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={stockActualStr}
              onChangeText={(txt) => {
                setStockActualStr(txt);
                if (errores.stockActual) setErrores((prev) => ({ ...prev, stockActual: undefined }));
              }}
              accessibilityLabel="Stock inicial por defecto 0 mayor o igual a 0"
            />
            {errores.stockActual && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errores.stockActual}</Text>}
          </View>

          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={[styles.etiqueta, { color: theme.text }]}>Stock mínimo *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: errores.stockMinimo ? theme.danger : theme.border, backgroundColor: theme.card }]}
              placeholder="3"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={stockMinimoStr}
              onChangeText={(txt) => {
                setStockMinimoStr(txt);
                if (errores.stockMinimo) setErrores((prev) => ({ ...prev, stockMinimo: undefined }));
              }}
              accessibilityLabel="Stock mínimo de alerta por defecto 3 mayor o igual a 1"
            />
            {errores.stockMinimo && <Text style={[styles.errorTexto, { color: theme.danger }]}>{errores.stockMinimo}</Text>}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={[styles.etiqueta, { color: theme.text }]}>Unidad de medida</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContenedor}>
            {UNIDADES_COMUNES.map((u) => (
              <Pressable
                key={u}
                style={[styles.chip, { backgroundColor: unidadMedida === u ? theme.tint : theme.card, borderColor: unidadMedida === u ? theme.tint : theme.border }]}
                onPress={() => setUnidadMedida(u)}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar unidad de medida ${u}`}>
                <Text style={[styles.chipTexto, { color: unidadMedida === u ? '#ffffff' : theme.text }]}>{u}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.botonesAccion}>
          <Pressable
            style={[styles.botonCancelar, { backgroundColor: theme.backgroundElement }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancelar registro y volver">
            <Text style={[styles.botonCancelarTexto, { color: theme.text }]}>Cancelar</Text>
          </Pressable>

          <Pressable
            style={[styles.botonGuardar, { backgroundColor: theme.tint, opacity: guardando ? 0.7 : 1 }]}
            onPress={handleGuardar}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel="Guardar nuevo producto en inventario SQLite"
            accessibilityState={{ disabled: guardando }}>
            {guardando ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.botonGuardarTexto}>Guardar Producto</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  encabezado: { marginBottom: 6 },
  titulo: { fontSize: 20, fontWeight: '700' },
  subtitulo: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  bannerError: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  bannerErrorTexto: { flex: 1, fontSize: 13, fontWeight: '500' },
  campo: { gap: 6 },
  filaCampos: { flexDirection: 'row', gap: 12 },
  etiqueta: { fontSize: 14, fontWeight: '600' },
  input: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  errorTexto: { fontSize: 12, fontWeight: '500' },
  chipsContenedor: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTexto: { fontSize: 13, fontWeight: '600' },
  botonesAccion: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  botonCancelar: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  botonCancelarTexto: { fontSize: 15, fontWeight: '600' },
  botonGuardar: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, justifyContent: 'center', minWidth: 140, alignItems: 'center' },
  botonGuardarTexto: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
