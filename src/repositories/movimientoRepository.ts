/**
 * Repositorio de Movimientos de Stock con SQL 100% Parametrizado.
 * Implementa las operaciones de persistencia y trazabilidad de movimientos según la Sección 8 y 9.2.
 */

import type { DatabaseClient, MovimientoStockRow, SQLiteRunResult } from '../db/types.ts';

export interface InputRegistrarMovimiento {
  producto_id: number;
  delta: number;
  motivo: string;
  fecha?: string;
  remote_id?: string | null;
  updated_at?: string | null;
}

export interface MovimientoStockConProductoRow extends MovimientoStockRow {
  producto_nombre: string;
}

export const SQL_REGISTRAR_MOVIMIENTO = `
INSERT INTO movimiento_stock (
  producto_id, delta, motivo, fecha, remote_id, updated_at, pending
) VALUES (?, ?, ?, ?, ?, ?, 1);
`.trim();

export const SQL_OBTENER_MOVIMIENTOS_POR_PRODUCTO = `
SELECT * FROM movimiento_stock
WHERE producto_id = ? AND deleted = 0
ORDER BY fecha DESC;
`.trim();

export const SQL_OBTENER_TODOS_MOVIMIENTOS = `
SELECT m.*, p.nombre AS producto_nombre
FROM movimiento_stock m
JOIN producto p ON m.producto_id = p.id
WHERE m.deleted = 0
ORDER BY m.fecha DESC
LIMIT ?;
`.trim();

/**
 * Registra un movimiento de stock en la base de datos con pending = 1.
 */
export async function registrar(
  db: DatabaseClient,
  input: InputRegistrarMovimiento
): Promise<SQLiteRunResult> {
  const fecha = input.fecha ?? new Date().toISOString();
  const remoteId = input.remote_id ?? null;
  const updatedAt = input.updated_at ?? new Date().toISOString();

  return await db.runAsync(SQL_REGISTRAR_MOVIMIENTO, [
    input.producto_id,
    input.delta,
    input.motivo,
    fecha,
    remoteId,
    updatedAt,
  ]);
}

/**
 * Obtiene el historial de movimientos de un producto específico,
 * ordenado descendentemente por fecha.
 */
export async function obtenerPorProducto(
  db: DatabaseClient,
  productoId: number
): Promise<MovimientoStockRow[]> {
  return await db.getAllAsync<MovimientoStockRow>(SQL_OBTENER_MOVIMIENTOS_POR_PRODUCTO, [
    productoId,
  ]);
}

/**
 * Obtiene todos los movimientos activos unidos con el nombre del producto,
 * limitando el número de resultados según el parámetro limite (por defecto 50).
 */
export async function obtenerTodos(
  db: DatabaseClient,
  limite: number = 50
): Promise<MovimientoStockConProductoRow[]> {
  return await db.getAllAsync<MovimientoStockConProductoRow>(SQL_OBTENER_TODOS_MOVIMIENTOS, [
    limite,
  ]);
}

export const movimientoRepository = {
  registrar,
  obtenerPorProducto,
  obtenerTodos,
};
