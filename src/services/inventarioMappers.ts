/**
 * Mapeadores de datos y gestión de conexión SQLite para inventario.
 */

import type { DatabaseClient, MovimientoStockRow, ProductoRow } from '../db/types.ts';
import { centavosAPrecio } from '../db/types.ts';
import type { MovimientoStockConProductoRow } from '../repositories/movimientoRepository.ts';
import type { MovimientoStock, Producto, TipoMovimiento } from '../types/inventario.ts';
import { PRODUCTOS_INICIALES } from './mockInventario.ts';

let activeDatabaseClient: DatabaseClient | null = null;

export function setDatabaseClient(db: DatabaseClient | null): void {
  activeDatabaseClient = db;
}

export function getDatabaseClient(): DatabaseClient | null {
  return activeDatabaseClient;
}

export async function resolveDatabase(customDb?: DatabaseClient): Promise<DatabaseClient> {
  if (customDb) return customDb;
  if (activeDatabaseClient) return activeDatabaseClient;

  try {
    const { getDatabase } = await import('../db/database.ts');
    activeDatabaseClient = await getDatabase();
    return activeDatabaseClient;
  } catch {
    throw new Error('Base de datos SQLite no inicializada. Ejecute inicializarBD() primero.');
  }
}

export function mapearProductoRowAProducto(row: ProductoRow): Producto {
  const semilla = PRODUCTOS_INICIALES.find(
    (p) => p.codigoBarras === row.codigo || p.id === row.remote_id
  );

  return {
    id: String(row.id),
    codigoBarras: row.codigo ?? '',
    nombre: row.nombre,
    categoria: semilla?.categoria ?? 'General',
    precio: centavosAPrecio(row.precio_centavos),
    stockActual: row.stock,
    stockMinimo: row.minimo,
    unidadMedida: semilla?.unidadMedida ?? 'unidad',
    actualizadoEn: row.updated_at ?? new Date().toISOString(),
  };
}

export function mapearMovimientoRowAMovimiento(
  row: MovimientoStockConProductoRow | MovimientoStockRow,
  nombrePorDefecto?: string
): MovimientoStock {
  const productoNombre =
    'producto_nombre' in row && row.producto_nombre
      ? row.producto_nombre
      : nombrePorDefecto ?? `Producto #${row.producto_id}`;

  const tipo: TipoMovimiento = row.delta > 0 ? 'ENTRADA' : row.delta < 0 ? 'SALIDA' : 'AJUSTE';
  const cantidad = Math.abs(row.delta);
  let stockAnterior = 0;
  let stockNuevo = cantidad;

  if (row.remote_id && row.remote_id.startsWith('{')) {
    try {
      const parsed = JSON.parse(row.remote_id) as { anterior?: number; nuevo?: number };
      if (typeof parsed.anterior === 'number') stockAnterior = parsed.anterior;
      if (typeof parsed.nuevo === 'number') stockNuevo = parsed.nuevo;
    } catch {
      // remote_id no contenía JSON válido
    }
  }

  return {
    id: String(row.id),
    productoId: String(row.producto_id),
    productoNombre,
    tipo,
    cantidad,
    stockAnterior,
    stockNuevo,
    motivo: row.motivo,
    fecha: row.fecha,
  };
}
