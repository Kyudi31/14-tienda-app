import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ProductHeaderCard } from '@/components/producto/ProductHeaderCard';
import { ProductMovementHistory } from '@/components/producto/ProductMovementHistory';
import { StockAdjustmentForm } from '@/components/producto/StockAdjustmentForm';
import { Colors } from '@/constants/theme';
import {
  ajustarStock,
  getMovimientosPorProducto,
  getProductoByCodigo,
  getProductoById,
} from '@/services/inventario';
import { Producto, TipoMovimiento } from '@/types/inventario';

export default function DetalleProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const productoEncontrado: Producto | undefined =
    getProductoById(id ?? '') ?? getProductoByCodigo(id ?? '');

  const [producto, setProducto] = useState<Producto | undefined>(productoEncontrado);
  const [tipo, setTipo] = useState<TipoMovimiento>('ENTRADA');
  const [cantidadStr, setCantidadStr] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [mensajeEstado, setMensajeEstado] = useState<{ texto: string; error: boolean } | null>(null);

  if (!producto) {
    return (
      <View style={[styles.centrado, { backgroundColor: theme.background }]}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
          size={48}
          tintColor={theme.warning}
        />
        <Text style={[styles.noEncontradoTitulo, { color: theme.text }]}>
          Producto no encontrado
        </Text>
        <Text style={[styles.noEncontradoSub, { color: theme.textSecondary }]}>
          No se encontró ningún registro con el identificador o código: {id}
        </Text>
        <Pressable
          style={[styles.botonVolver, { backgroundColor: theme.tint }]}
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Volver al inventario de productos">
          <Text style={styles.botonVolverTexto}>Volver al Inventario</Text>
        </Pressable>
      </View>
    );
  }

  const cantidad = parseInt(cantidadStr, 10) || 0;
  const nuevoStockProyectado =
    tipo === 'ENTRADA' ? producto.stockActual + cantidad : producto.stockActual - cantidad;
  const esSalidaInvalida = tipo === 'SALIDA' && nuevoStockProyectado < 0;
  const bajoStock = producto.stockActual <= producto.stockMinimo;
  const movimientosProducto = getMovimientosPorProducto(producto.id);

  const handleConfirmarAjuste = () => {
    if (cantidad <= 0) {
      setMensajeEstado({ texto: 'Ingresa una cantidad mayor a 0.', error: true });
      return;
    }

    if (esSalidaInvalida) {
      setMensajeEstado({
        texto: `Operación rechazada: stock insuficiente. El stock actual es ${producto.stockActual} y no puede quedar negativo.`,
        error: true,
      });
      return;
    }

    const resultado = ajustarStock(producto.id, tipo, cantidad, motivo);
    if (resultado.exito && resultado.producto) {
      setProducto(resultado.producto);
      setMensajeEstado({ texto: resultado.mensaje, error: false });
      setMotivo('');
      setCantidadStr('1');
    } else {
      setMensajeEstado({ texto: resultado.mensaje, error: true });
    }
  };

  const modificarCantidad = (delta: number) => {
    const actual = parseInt(cantidadStr, 10) || 0;
    const nuevo = Math.max(1, actual + delta);
    setCantidadStr(String(nuevo));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContenido}>
        <ProductHeaderCard
          producto={producto}
          bajoStock={bajoStock}
          theme={theme}
        />

        <StockAdjustmentForm
          tipo={tipo}
          cantidadStr={cantidadStr}
          motivo={motivo}
          unidadMedida={producto.unidadMedida}
          nuevoStockProyectado={nuevoStockProyectado}
          esSalidaInvalida={esSalidaInvalida}
          mensajeEstado={mensajeEstado}
          onSelectTipo={(nuevoTipo) => {
            setTipo(nuevoTipo);
            setMensajeEstado(null);
          }}
          onCantidadChange={setCantidadStr}
          onModificarCantidad={modificarCantidad}
          onMotivoChange={setMotivo}
          onSubmit={handleConfirmarAjuste}
          theme={theme}
        />

        <ProductMovementHistory
          movimientos={movimientosProducto}
          theme={theme}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContenido: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noEncontradoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  noEncontradoSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  botonVolver: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  botonVolverTexto: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
