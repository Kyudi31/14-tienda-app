import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';

import { AppTheme } from '@/constants/theme';

interface CameraPreviewProps {
  puedeUsarCamara: boolean;
  escaneoPausado: boolean;
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
  onRequestPermission: () => void;
  permisoOtorgado: boolean;
  theme: AppTheme;
}

export function CameraPreview({
  puedeUsarCamara,
  escaneoPausado,
  onBarcodeScanned,
  onRequestPermission,
  permisoOtorgado,
  theme,
}: CameraPreviewProps) {
  const [zoom, setZoom] = useState(0);
  const startZoom = useRef(0);

  const cambiarZoom = (nuevoZoom: number) => {
    const clamp = Math.max(0, Math.min(1, Math.round(nuevoZoom * 100) / 100));
    setZoom(clamp);
  };

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      startZoom.current = zoom;
    })
    .onUpdate((event) => {
      const factor = (event.scale - 1) * 0.4;
      cambiarZoom(startZoom.current + factor);
    });

  const nivelZoomTexto = `${(1 + zoom * 3).toFixed(1)}x`;

  if (puedeUsarCamara) {
    return (
      <GestureDetector gesture={pinchGesture}>
        <View style={styles.camara}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            zoom={zoom}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
            }}
            onBarcodeScanned={escaneoPausado ? undefined : onBarcodeScanned}>
            <View style={styles.overlay}>
              <View style={[styles.visorMarco, { borderColor: theme.tint }]} />
              <Text style={styles.visorTexto}>
                Alinea el código de barras en el recuadro
              </Text>

              {/* Alternativa accesible obligatoria: Controles visibles de zoom */}
              <View style={styles.zoomContenedor}>
                <Pressable
                  style={({ pressed }) => [
                    styles.botonZoomPaso,
                    { opacity: zoom <= 0.01 ? 0.35 : pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => cambiarZoom(zoom - 0.1)}
                  disabled={zoom <= 0.01}
                  accessibilityRole="button"
                  accessibilityLabel="Disminuir zoom"
                  accessibilityHint="Reduce el nivel de aumento de la cámara">
                  <Text style={styles.botonZoomTexto}>−</Text>
                </Pressable>

                <Pressable
                  style={[styles.botonZoomPreset, zoom < 0.1 && styles.botonZoomPresetActivo]}
                  onPress={() => cambiarZoom(0)}
                  accessibilityRole="button"
                  accessibilityLabel="Establecer zoom en 1x"
                  accessibilityState={{ selected: zoom < 0.1 }}>
                  <Text style={[styles.botonZoomTextoPreset, zoom < 0.1 && styles.botonZoomTextoActivo]}>
                    1x
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.botonZoomPreset, Math.abs(zoom - 0.33) < 0.1 && styles.botonZoomPresetActivo]}
                  onPress={() => cambiarZoom(0.33)}
                  accessibilityRole="button"
                  accessibilityLabel="Establecer zoom en 2x"
                  accessibilityState={{ selected: Math.abs(zoom - 0.33) < 0.1 }}>
                  <Text style={[styles.botonZoomTextoPreset, Math.abs(zoom - 0.33) < 0.1 && styles.botonZoomTextoActivo]}>
                    2x
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.botonZoomPaso,
                    { opacity: zoom >= 0.99 ? 0.35 : pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => cambiarZoom(zoom + 0.1)}
                  disabled={zoom >= 0.99}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar zoom"
                  accessibilityHint="Incrementa el nivel de aumento de la cámara">
                  <Text style={styles.botonZoomTexto}>+</Text>
                </Pressable>
              </View>

              <Text
                style={styles.zoomIndicadorTexto}
                accessibilityRole="text"
                accessibilityLabel={`Nivel de zoom actual: ${nivelZoomTexto}`}>
                Zoom: {nivelZoomTexto}
              </Text>
            </View>
          </CameraView>
        </View>
      </GestureDetector>
    );
  }

  return (
    <View style={[styles.sinCamara, { backgroundColor: theme.backgroundElement }]}>
      <SymbolView
        name={{ ios: 'camera.fill', android: 'camera_alt', web: 'camera_alt' }}
        size={48}
        tintColor={theme.textSecondary}
      />
      <Text style={[styles.sinCamaraTitulo, { color: theme.text }]}>
        {Platform.OS === 'web'
          ? 'Vista de cámara no disponible en navegador'
          : 'Permiso de cámara requerido'}
      </Text>
      <Text style={[styles.sinCamaraSub, { color: theme.textSecondary }]}>
        Puedes ingresar el código numérico manualmente o conceder permisos.
      </Text>
      {Platform.OS !== 'web' && !permisoOtorgado && (
        <Pressable
          style={[styles.botonPermiso, { backgroundColor: theme.tint }]}
          onPress={onRequestPermission}
          accessibilityRole="button"
          accessibilityLabel="Solicitar permiso para usar la cámara">
          <Text style={styles.botonPermisoTexto}>Conceder Permiso</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  camara: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  visorMarco: { width: 250, height: 180, borderWidth: 2, borderRadius: 16, backgroundColor: 'transparent' },
  visorTexto: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zoomContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 20,
    gap: 8,
  },
  botonZoomPaso: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonZoomTexto: { color: '#ffffff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  botonZoomPreset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  botonZoomPresetActivo: { backgroundColor: '#ffffff' },
  botonZoomTextoPreset: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  botonZoomTextoActivo: { color: '#000000', fontWeight: '700' },
  zoomIndicadorTexto: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sinCamara: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  sinCamaraTitulo: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  sinCamaraSub: { fontSize: 14, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  botonPermiso: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  botonPermisoTexto: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
