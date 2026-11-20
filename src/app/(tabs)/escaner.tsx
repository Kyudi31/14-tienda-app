import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { SymbolView } from 'expo-symbols';

import { CameraPreview } from '@/components/escaner/CameraPreview';
import { CodigoNoRegistradoCard } from '@/components/escaner/CodigoNoRegistradoCard';
import { ManualBarcodeInputModal } from '@/components/escaner/ManualBarcodeInputModal';
import { ScannedProductCard } from '@/components/escaner/ScannedProductCard';
import { Colors } from '@/constants/theme';
import { buscarProductosAsync, getProductoByCodigoAsync } from '@/services/inventario';
import { Producto } from '@/types/inventario';

export default function EscanerScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [permission, requestPermission] = useCameraPermissions();
  const [modalManualVisible, setModalManualVisible] = useState(false);
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null);
  const [codigoNoRegistrado, setCodigoNoRegistrado] = useState<string | null>(null);
  const [escaneoPausado, setEscaneoPausado] = useState(false);

  const ultimoCodigoEscaneadoRef = useRef<string | null>(null);
  const ultimoTimestampEscaneadoRef = useRef<number>(0);

  const reanudarEscaneo = useCallback(() => {
    setEscaneoPausado(false);
    setProductoEncontrado(null);
    setCodigoNoRegistrado(null);
    setErrorMensaje(null);
    ultimoCodigoEscaneadoRef.current = null;
    ultimoTimestampEscaneadoRef.current = 0;
  }, []);

  useFocusEffect(
    useCallback(() => {
      reanudarEscaneo();
    }, [reanudarEscaneo])
  );

  const procesarCodigo = async (codigo: string) => {
    const limpiado = codigo.trim();
    if (!limpiado) {
      setErrorMensaje('Por favor ingresa un código de barras o término válido.');
      return;
    }

    try {
      const prod = await getProductoByCodigoAsync(limpiado);
      if (prod) {
        setProductoEncontrado(prod);
        setCodigoNoRegistrado(null);
        setErrorMensaje(null);
        setModalManualVisible(false);
      } else {
        setProductoEncontrado(null);
        setCodigoNoRegistrado(limpiado);
        setErrorMensaje(null);
        setModalManualVisible(false);
      }
    } catch {
      setErrorMensaje('Error al consultar el producto en SQLite.');
    }
  };

  const handleBarcodeScanned = (resultado: BarcodeScanningResult) => {
    const codigo = resultado.data?.trim();
    if (!codigo || escaneoPausado) return;

    // Regla de validación Sección 7: Throttle de 1.5s para el mismo código de barras
    const ahora = Date.now();
    if (
      ultimoCodigoEscaneadoRef.current === codigo &&
      ahora - ultimoTimestampEscaneadoRef.current < 1500
    ) {
      return;
    }

    ultimoCodigoEscaneadoRef.current = codigo;
    ultimoTimestampEscaneadoRef.current = ahora;
    setEscaneoPausado(true);
    void procesarCodigo(codigo);
  };

  const ejecutarBusquedaManual = async () => {
    const termino = busquedaTexto.trim();
    if (!termino) {
      setErrorMensaje('Ingresa un código de barras o nombre.');
      return;
    }

    try {
      const prodDirecto = await getProductoByCodigoAsync(termino);
      if (prodDirecto) {
        setResultadosBusqueda([prodDirecto]);
        setBusquedaRealizada(true);
        setErrorMensaje(null);
        return;
      }

      const coincidencias = await buscarProductosAsync(termino);
      setResultadosBusqueda(coincidencias);
      setBusquedaRealizada(true);
      setErrorMensaje(null);
    } catch {
      setErrorMensaje('Error al buscar en SQLite.');
    }
  };

  const irADarDeAlta = (termino: string) => {
    setModalManualVisible(false);
    const limpio = termino.trim();
    const esNumero = /^\d+$/.test(limpio);
    router.push({
      pathname: '/producto/nuevo',
      params: esNumero && limpio ? { codigo: limpio } : limpio ? { nombre: limpio } : {},
    });
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
          onAbrirManual={() => {
            setErrorMensaje(null);
            setModalManualVisible(true);
          }}
          onCrearProducto={() => router.push('/producto/nuevo')}
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
          accessibilityLabel="Entrada manual o búsqueda de producto"
          accessibilityHint="Abre un diálogo para digitar el código o buscar por nombre">
          <SymbolView
            name={{ ios: 'keyboard', android: 'keyboard', web: 'keyboard' }}
            size={20}
            tintColor={theme.text}
          />
          <Text style={[styles.botonManualTexto, { color: theme.text }]}>
            Digitar código o buscar por nombre
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

      {/* Si el código existe en el catálogo: muestra tarjeta con acceso a /producto/[id] */}
      {productoEncontrado && (
        <ScannedProductCard
          producto={productoEncontrado}
          onVerDetalle={() => router.push(`/producto/${productoEncontrado.id}`)}
          theme={theme}
        />
      )}

      {/* Criterio de Aceptación 2: Si el código NO existe, ofrecer registrar con código precargado */}
      {codigoNoRegistrado && (
        <CodigoNoRegistradoCard
          codigo={codigoNoRegistrado}
          onRegistrar={() =>
            router.push({
              pathname: '/producto/nuevo',
              params: { codigo: codigoNoRegistrado },
            })
          }
          onDescartar={reanudarEscaneo}
          theme={theme}
        />
      )}

      {/* Criterio de Aceptación 3: Modal de búsqueda manual por nombre o código */}
      <ManualBarcodeInputModal
        visible={modalManualVisible}
        busquedaTexto={busquedaTexto}
        errorMensaje={errorMensaje}
        resultados={resultadosBusqueda}
        busquedaRealizada={busquedaRealizada}
        onTextoChange={(txt) => {
          setBusquedaTexto(txt);
          setBusquedaRealizada(false);
        }}
        onBuscar={ejecutarBusquedaManual}
        onSeleccionarProducto={(p) => {
          setModalManualVisible(false);
          router.push(`/producto/${p.id}`);
        }}
        onDarDeAlta={irADarDeAlta}
        onCerrar={() => {
          setModalManualVisible(false);
          setBusquedaTexto('');
          setResultadosBusqueda([]);
          setBusquedaRealizada(false);
        }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camaraContenedor: { flex: 1, overflow: 'hidden' },
  accionesContainer: { padding: 16, borderTopWidth: 1, gap: 10 },
  botonManual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  botonManualTexto: { fontSize: 15, fontWeight: '600' },
  botonReanudar: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonReanudarTexto: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
