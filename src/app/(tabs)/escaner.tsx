import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { SymbolView } from 'expo-symbols';

import { CameraPreview } from '@/components/escaner/CameraPreview';
import { ManualBarcodeInputModal } from '@/components/escaner/ManualBarcodeInputModal';
import { ScannedProductCard } from '@/components/escaner/ScannedProductCard';
import { Colors } from '@/constants/theme';
import { getProductoByCodigo } from '@/services/inventario';
import { Producto } from '@/types/inventario';

export default function EscanerScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [permission, requestPermission] = useCameraPermissions();
  const [modalManualVisible, setModalManualVisible] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null);
  const [escaneoPausado, setEscaneoPausado] = useState(false);

  const procesarCodigo = (codigo: string) => {
    const limpiado = codigo.trim();
    if (!limpiado) {
      setErrorMensaje('Por favor ingresa un código de barras válido.');
      return;
    }

    const prod = getProductoByCodigo(limpiado);
    if (prod) {
      setProductoEncontrado(prod);
      setErrorMensaje(null);
      setModalManualVisible(false);
    } else {
      setProductoEncontrado(null);
      setErrorMensaje(`No se encontró producto con código: ${limpiado}`);
    }
  };

  const handleBarcodeScanned = (resultado: BarcodeScanningResult) => {
    if (escaneoPausado) return;
    setEscaneoPausado(true);
    procesarCodigo(resultado.data);
  };

  const reanudarEscaneo = () => {
    setEscaneoPausado(false);
    setProductoEncontrado(null);
    setErrorMensaje(null);
  };

  const puedeUsarCamara = Platform.OS !== 'web' && !!permission?.granted;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.camaraContenedor}>
        <CameraPreview
          puedeUsarCamara={puedeUsarCamara}
          escaneoPausado={escaneoPausado}
          onBarcodeScanned={handleBarcodeScanned}
          onRequestPermission={() => requestPermission()}
          permisoOtorgado={!!permission?.granted}
          theme={theme}
        />
      </View>

      <View style={[styles.accionesContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <Pressable
          style={[styles.botonManual, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          onPress={() => {
            setErrorMensaje(null);
            setModalManualVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Entrada manual de código de barras"
          accessibilityHint="Abre un formulario para digitar el código numérico manualmente">
          <SymbolView
            name={{ ios: 'keyboard', android: 'keyboard', web: 'keyboard' }}
            size={20}
            tintColor={theme.text}
          />
          <Text style={[styles.botonManualTexto, { color: theme.text }]}>
            Digitar código manualmente
          </Text>
        </Pressable>

        {escaneoPausado && (
          <Pressable
            style={[styles.botonReanudar, { backgroundColor: theme.tint }]}
            onPress={reanudarEscaneo}
            accessibilityRole="button"
            accessibilityLabel="Escanear otro producto">
            <Text style={styles.botonReanudarTexto}>Escanear de nuevo</Text>
          </Pressable>
        )}
      </View>

      {productoEncontrado && (
        <ScannedProductCard
          producto={productoEncontrado}
          onVerDetalle={() => router.push(`/producto/${productoEncontrado.id}`)}
          theme={theme}
        />
      )}

      <ManualBarcodeInputModal
        visible={modalManualVisible}
        codigoManual={codigoManual}
        errorMensaje={errorMensaje}
        onCodigoChange={setCodigoManual}
        onBuscar={() => procesarCodigo(codigoManual)}
        onCerrar={() => {
          setModalManualVisible(false);
          setCodigoManual('');
        }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camaraContenedor: {
    flex: 1,
    overflow: 'hidden',
  },
  accionesContainer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  botonManual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  botonManualTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
  botonReanudar: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonReanudarTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
