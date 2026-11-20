/**
 * Lógica de Reversión y Auditoría de Stock (Deshacer Movimiento) en SQLite.
 * Cumple con la regla de negocio de stock nunca negativo y trazabilidad con pending = 1.
 */

import type { DatabaseClient, ProductoRow } from '../db/types.ts';
import { movimientoRepository } from '../repositories/movimientoRepository.ts';
import { productoRepository } from '../repositories/productoRepository.ts';
import type {
  MovimientoStock,
  Producto,
  ResultadoAjuste,
  TipoMovimiento,
} from '../types/inventario.ts';
import {
  buscarProductoRow,
  mapearProductoRowAProducto,
  resolveDatabase,
} from './inventarioMappers.ts';

/**
 * Ejecuta feedback háptico usando expo-haptics si el hardware lo soporta.
 * En entornos sin soporte háptico (web, node test) no produce error.
 */
export async function feedbackHapticoAsync(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    if (Haptics?.notificationAsync) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {
    // Entorno sin soporte háptico (web, emulador sin sensor o runner de test)
  }
}

/**
 * Revierte el último movimiento de inventario registrado en SQLite.
 * - Si no hay movimientos, retorna { exito: false, mensaje: 'No hay movimientos para deshacer' }.
 * - Si el último movimiento fue ENTRADA de X unidades, deshacerlo resta X unidades (validando stock - X >= 0).
 * - Si fue SALIDA de X unidades, deshacerlo suma X unidades.
 * - Actualiza el stock en SQLite con pending = 1 y registra un movimiento de reversión/auditoría.
 * - Brinda feedback háptico con expo-haptics (Haptics.notificationAsync).
 */
export async function deshacerUltimoMovimientoSQLite(
  productoIdOrDb?: string | number | DatabaseClient,
  db?: DatabaseClient
): Promise<ResultadoAjuste> {
  let clientDb: DatabaseClient | undefined;
  let targetProductoId: string | number | undefined;

  if (
    productoIdOrDb &&
    typeof productoIdOrDb === 'object' &&
    'runAsync' in productoIdOrDb
  ) {
    clientDb = productoIdOrDb;
    targetProductoId = undefined;
  } else {
    targetProductoId = productoIdOrDb;
    clientDb = db;
  }

  const client = await resolveDatabase(clientDb);

  let numericProdId: number | undefined;
  if (targetProductoId !== undefined) {
    const prod = await buscarProductoRow(client, targetProductoId);
    if (prod) {
      numericProdId = prod.id;
    } else {
      const parsed = typeof targetProductoId === 'number' ? targetProductoId : parseInt(targetProductoId, 10);
      if (!isNaN(parsed)) numericProdId = parsed;
    }
  }

  const ultimoMov = await movimientoRepository.obtenerUltimo(client, numericProdId);
  if (!ultimoMov) {
    return { exito: false, mensaje: 'No hay movimientos para deshacer' };
  }

  const prodRow = await productoRepository.obtenerPorId(client, ultimoMov.producto_id);
  if (!prodRow) {
    return { exito: false, mensaje: 'Producto asociado al movimiento no encontrado' };
  }

  const stockActual = prodRow.stock;
  let nuevoStock: number;
  let deltaReversion: number;
  let tipoReversion: TipoMovimiento;

  if (ultimoMov.delta > 0) {
    const cantidadRevertir = ultimoMov.delta;
    nuevoStock = stockActual - cantidadRevertir;
    if (nuevoStock < 0) {
      return {
        exito: false,
        mensaje: `No se puede deshacer: el stock resultante (${nuevoStock}) sería negativo. El stock actual es ${stockActual}.`,
      };
    }
    deltaReversion = -cantidadRevertir;
    tipoReversion = 'SALIDA';
  } else if (ultimoMov.delta < 0) {
    const cantidadRevertir = Math.abs(ultimoMov.delta);
    nuevoStock = stockActual + cantidadRevertir;
    deltaReversion = cantidadRevertir;
    tipoReversion = 'ENTRADA';
  } else {
    return {
      exito: false,
      mensaje: 'El último movimiento no modificó la cantidad de stock.',
    };
  }

  const fecha = new Date().toISOString();
  const motivoReversion = `Deshacer: reversión de ${ultimoMov.delta > 0 ? 'entrada' : 'salida'} (${Math.abs(ultimoMov.delta)} unidades)`;
  const remoteMeta = JSON.stringify({ anterior: stockActual, nuevo: nuevoStock });

  // Actualiza stock en SQLite con pending = 1
  await productoRepository.actualizarStock(client, prodRow.id, nuevoStock, fecha);

  // Registra movimiento de reversión/auditoría con pending = 1
  const movRes = await movimientoRepository.registrar(client, {
    producto_id: prodRow.id,
    delta: deltaReversion,
    motivo: motivoReversion,
    fecha,
    remote_id: remoteMeta,
    updated_at: fecha,
  });

  // Feedback háptico
  await feedbackHapticoAsync();

  const productoActualizado: Producto = {
    ...mapearProductoRowAProducto(prodRow),
    stockActual: nuevoStock,
    actualizadoEn: fecha,
  };

  const nuevoMovimiento: MovimientoStock = {
    id: String(movRes.lastInsertRowId),
    productoId: String(prodRow.id),
    productoNombre: prodRow.nombre,
    tipo: tipoReversion,
    cantidad: Math.abs(deltaReversion),
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
    motivo: motivoReversion,
    fecha,
  };

  return {
    exito: true,
    mensaje: `Se deshizo el último movimiento (${Math.abs(ultimoMov.delta)} unidades de ${prodRow.nombre}). Stock restaurado a ${nuevoStock}.`,
    producto: productoActualizado,
    movimiento: nuevoMovimiento,
  };
}
