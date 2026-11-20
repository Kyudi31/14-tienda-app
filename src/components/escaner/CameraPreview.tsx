import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
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
  if (puedeUsarCamara) {
    return (
      <CameraView
        style={styles.camara}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={escaneoPausado ? undefined : onBarcodeScanned}>
        <View style={styles.overlay}>
          <View style={[styles.visorMarco, { borderColor: theme.tint }]} />
          <Text style={styles.visorTexto}>
            Alinea el código de barras en el recuadro
          </Text>
        </View>
      </CameraView>
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
  camara: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visorMarco: {
    width: 250,
    height: 180,
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
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
  sinCamara: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sinCamaraTitulo: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  sinCamaraSub: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
  botonPermiso: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  botonPermisoTexto: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
