/**
 * Componente accesible de estado de sincronización.
 * Permite visualizar si hay cambios pendientes o si el catálogo está sincronizado,
 * y ofrece un botón táctil para forzar la sincronización manual con el servidor.
 * Cumple con los requerimientos de accesibilidad y de la Sección 9.3 de la planeación.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors } from '../../constants/theme.ts';
import {
  contarPendientesAsync,
  type ReporteSincronizacion,
  sincronizar,
} from '../../services/sincronizacionService.ts';

export type EstadoSync = 'Sincronizado' | 'Pendientes' | 'Sincronizando';

export interface SyncStatusBadgeProps {
  onSyncComplete?: (reporte: ReporteSincronizacion) => void;
  style?: object;
}

export function SyncStatusBadge({ onSyncComplete, style }: SyncStatusBadgeProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [estado, setEstado] = useState<EstadoSync>('Sincronizado');
  const [pendientes, setPendientes] = useState<number>(0);

  const actualizarEstado = useCallback(async () => {
    try {
      const count = await contarPendientesAsync();
      setPendientes(count);
      setEstado((prev) => (prev === 'Sincronizando' ? prev : count > 0 ? 'Pendientes' : 'Sincronizado'));
    } catch {
      // Ignorar error si base de datos aún no está lista
    }
  }, []);

  useEffect(() => {
    actualizarEstado();
  }, [actualizarEstado]);

  const handleForzarSincronizacion = async () => {
    if (estado === 'Sincronizando') return;

    setEstado('Sincronizando');
    try {
      const reporte = await sincronizar();
      await actualizarEstado();
      if (onSyncComplete) {
        onSyncComplete(reporte);
      }
    } catch {
      await actualizarEstado();
    }
  };

  const getColores = () => {
    switch (estado) {
      case 'Sincronizando':
        return {
          bg: scheme === 'dark' ? '#1e3a5f' : '#e0f2fe',
          text: scheme === 'dark' ? '#93c5fd' : '#0284c7',
          indicator: '#0284c7',
        };
      case 'Pendientes':
        return {
          bg: scheme === 'dark' ? '#451a03' : '#fef3c7',
          text: scheme === 'dark' ? '#fcd34d' : '#d97706',
          indicator: '#d97706',
        };
      case 'Sincronizado':
      default:
        return {
          bg: scheme === 'dark' ? '#064e3b' : '#d1fae5',
          text: scheme === 'dark' ? '#6ee7b7' : '#059669',
          indicator: '#059669',
        };
    }
  };

  const colores = getColores();
  const etiquetaAccesible = `Estado de sincronización: ${estado}${
    estado === 'Pendientes' ? `, ${pendientes} pendientes` : ''
  }. Toca para forzar sincronización manual.`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.contenedor,
        { backgroundColor: colores.bg, borderColor: colores.text },
        pressed && styles.presionado,
        style,
      ]}
      onPress={handleForzarSincronizacion}
      disabled={estado === 'Sincronizando'}
      accessibilityRole="button"
      accessibilityLabel="Estado de sincronización"
      accessibilityHint={etiquetaAccesible}>
      {estado === 'Sincronizando' ? (
        <ActivityIndicator size="small" color={colores.indicator} style={styles.indicador} />
      ) : (
        <View style={[styles.punto, { backgroundColor: colores.indicator }]} />
      )}
      <Text style={[styles.texto, { color: colores.text }]}>
        {estado === 'Sincronizando'
          ? 'Sincronizando'
          : estado === 'Pendientes'
          ? `Pendientes (${pendientes})`
          : 'Sincronizado'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  presionado: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicador: {
    width: 12,
    height: 12,
  },
  texto: {
    fontSize: 12,
    fontWeight: '700',
  },
});
