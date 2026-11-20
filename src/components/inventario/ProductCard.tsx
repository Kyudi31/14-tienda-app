import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '@/constants/theme';
import { ajustarStockAsync } from '@/services/inventario';
import { Producto, TipoMovimiento } from '@/types/inventario';

const SWIPE_THRESHOLD = 75;
const MAX_SWIPE = 120;

interface ProductCardProps {
  item: Producto;
  onPress: () => void;
  theme: AppTheme;
  onStockChange?: (productoActualizado: Producto) => void;
}

export function ProductCard({ item, onPress, theme, onStockChange }: ProductCardProps) {
  const [producto, setProducto] = useState<Producto>(item);
  const stockActualSV = useSharedValue(item.stockActual);
  const translateX = useSharedValue(0);

  useEffect(() => {
    setProducto(item);
    stockActualSV.value = item.stockActual;
  }, [item, stockActualSV]);

  const ejecutarAjusteStock = async (delta: number) => {
    if (delta < 0 && producto.stockActual <= 0) return;
    const tipo: TipoMovimiento = delta > 0 ? 'ENTRADA' : 'SALIDA';
    const motivo = delta > 0 ? 'Ajuste rápido (+1)' : 'Ajuste rápido (-1)';
    try {
      const resultado = await ajustarStockAsync(producto.id, tipo, 1, motivo);
      if (resultado.exito && resultado.producto) {
        setProducto(resultado.producto);
        stockActualSV.value = resultado.producto.stockActual;
        onStockChange?.(resultado.producto);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (err) {
      console.error('Error al ajustar stock en SQLite:', err);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      'worklet';
      if (stockActualSV.value <= 0 && event.translationX < 0) {
        translateX.value = Math.max(event.translationX * 0.15, -35);
      } else {
        translateX.value = Math.min(Math.max(event.translationX, -MAX_SWIPE), MAX_SWIPE);
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX >= SWIPE_THRESHOLD) {
        runOnJS(ejecutarAjusteStock)(1);
      } else if (event.translationX <= -SWIPE_THRESHOLD && stockActualSV.value > 0) {
        runOnJS(ejecutarAjusteStock)(-1);
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const estiloAnimadoTarjeta = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const estiloFondoIzquierda = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 20, SWIPE_THRESHOLD], [0, 0.4, 1], Extrapolation.CLAMP),
  }));

  const estiloFondoDerecha = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20, 0], [1, 0.4, 0], Extrapolation.CLAMP),
  }));

  const bajoStock = producto.stockActual <= producto.stockMinimo;

  return (
    <View style={styles.cardContainer}>
      {/* Fondo deslizar a la derecha: +1 stock (Verde) */}
      <Animated.View style={[styles.accionFondo, styles.accionIzquierda, estiloFondoIzquierda]}>
        <View style={styles.accionContenido}>
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            size={24}
            tintColor="#ffffff"
          />
          <Text style={styles.accionTexto}>+1</Text>
        </View>
      </Animated.View>

      {/* Fondo deslizar a la izquierda: -1 stock (Naranja / Gris) */}
      <Animated.View
        style={[
          styles.accionFondo,
          styles.accionDerecha,
          producto.stockActual <= 0 && styles.accionDerechaBloqueada,
          estiloFondoDerecha,
        ]}>
        <View style={styles.accionContenido}>
          <Text style={styles.accionTexto}>{producto.stockActual > 0 ? '−1' : '0'}</Text>
          <SymbolView
            name={{
              ios: producto.stockActual > 0 ? 'minus.circle.fill' : 'xmark.circle.fill',
              android: producto.stockActual > 0 ? 'remove_circle' : 'cancel',
              web: producto.stockActual > 0 ? 'remove_circle' : 'cancel',
            }}
            size={24}
            tintColor="#ffffff"
          />
        </View>
      </Animated.View>

      {/* Tarjeta principal deslizable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: bajoStock ? theme.danger : theme.border },
            estiloAnimadoTarjeta,
          ]}>
          <View style={styles.header}>
            <Pressable
              style={styles.info}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={`Producto ${producto.nombre}, categoría ${producto.categoria}, código ${producto.codigoBarras}. Toca para abrir detalle.`}>
              <Text style={[styles.nombre, { color: theme.text }]}>{producto.nombre}</Text>
              <Text style={[styles.subtexto, { color: theme.textSecondary }]}>
                {producto.categoria} · Cód: {producto.codigoBarras}
              </Text>
            </Pressable>

            {/* Alternativa accesible obligatoria: botones visibles +/- */}
            <View style={styles.controlesStock}>
              <Pressable
                style={({ pressed }) => [
                  styles.botonStock,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    opacity: producto.stockActual <= 0 ? 0.35 : pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => ejecutarAjusteStock(-1)}
                disabled={producto.stockActual <= 0}
                accessibilityRole="button"
                accessibilityLabel="Disminuir stock en 1"
                accessibilityState={{ disabled: producto.stockActual <= 0 }}>
                <Text style={[styles.botonStockTexto, { color: theme.text }]}>−</Text>
              </Pressable>

              <View
                style={[
                  styles.badgeStock,
                  { backgroundColor: bajoStock ? theme.danger : theme.backgroundElement },
                ]}>
                <Text style={[styles.badgeText, { color: bajoStock ? '#ffffff' : theme.text }]}>
                  {producto.stockActual} {producto.unidadMedida}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.botonStock,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => ejecutarAjusteStock(1)}
                accessibilityRole="button"
                accessibilityLabel="Aumentar stock en 1">
                <Text style={[styles.botonStockTexto, { color: theme.text }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.footer}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Precio $${producto.precio.toLocaleString('es-CO')}. Toca para abrir detalle.`}>
            <Text style={[styles.precio, { color: theme.tint }]}>
              ${producto.precio.toLocaleString('es-CO')}
            </Text>
            {bajoStock && (
              <View style={styles.alertaContainer}>
                <Text style={[styles.alertaText, { color: theme.danger }]}>
                  ⚠️ Mínimo: {producto.stockMinimo}
                </Text>
              </View>
            )}
            <View style={[styles.botonAjustar, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.botonAjustarTexto, { color: theme.text }]}>
                Ajustar stock ›
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  accionFondo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  accionIzquierda: { backgroundColor: '#16a34a', justifyContent: 'flex-start' },
  accionDerecha: { backgroundColor: '#ea580c', justifyContent: 'flex-end' },
  accionDerechaBloqueada: { backgroundColor: '#64748b' },
  accionContenido: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accionTexto: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  card: { padding: 14, borderRadius: 12, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, marginRight: 8 },
  nombre: { fontSize: 16, fontWeight: '600' },
  subtexto: { fontSize: 13, marginTop: 2 },
  controlesStock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botonStock: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonStockTexto: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  badgeStock: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  precio: { fontSize: 16, fontWeight: '700' },
  alertaContainer: { paddingHorizontal: 6 },
  alertaText: { fontSize: 12, fontWeight: '600' },
  botonAjustar: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  botonAjustarTexto: { fontSize: 12, fontWeight: '600' },
});
