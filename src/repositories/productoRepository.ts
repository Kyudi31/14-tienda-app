/**
 * Repositorio de Productos con SQL 100% Parametrizado.
 * Implementa las operaciones de persistencia para SQLite según la Sección 8 y 9.2.
 */

import type { DatabaseClient, ProductoRow, SQLiteRunResult } from '../db/types.ts';

export interface InputCrearProducto {
  codigo: string | null;
  nombre: string;
  precio_centavos: number;
  stock?: number;
  minimo?: number;
  remote_id?: string | null;
  updated_at?: string | null;
}

export const SQL_OBTENER_TODOS_PRODUCTOS = `
SELECT * FROM producto
WHERE deleted = 0
ORDER BY nombre ASC;
`.trim();

export const SQL_OBTENER_PRODUCTO_POR_ID = `
SELECT * FROM producto
WHERE id = ? AND deleted = 0;
`.trim();

export const SQL_OBTENER_PRODUCTO_POR_CODIGO = `
SELECT * FROM producto
WHERE codigo = ? AND deleted = 0;
`.trim();

export const SQL_BUSCAR_PRODUCTOS = `
SELECT * FROM producto
WHERE (nombre LIKE ? OR codigo LIKE ?) AND deleted = 0
ORDER BY nombre ASC;
`.trim();

export const SQL_OBTENER_BAJO_STOCK = `
SELECT * FROM producto
WHERE stock <= minimo AND deleted = 0
ORDER BY nombre ASC;
`.trim();

export const SQL_CREAR_PRODUCTO = `
INSERT INTO producto (
  codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, pending
) VALUES (?, ?, ?, ?, ?, ?, ?, 1);
`.trim();

export const SQL_ACTUALIZAR_STOCK = `
UPDATE producto
SET stock = ?, updated_at = ?, pending = 1
WHERE id = ?;
`.trim();

export const SQL_ELIMINAR_LOGICO_PRODUCTO = `
UPDATE producto
SET deleted = 1, updated_at = ?, pending = 1
WHERE id = ?;
`.trim();

/**
 * Obtiene todos los productos activos (no borrados lógicamente),
 * ordenados alfabéticamente por nombre.
 */
export async function obtenerTodos(db: DatabaseClient): Promise<ProductoRow[]> {
  return await db.getAllAsync<ProductoRow>(SQL_OBTENER_TODOS_PRODUCTOS);
}

/**
 * Obtiene un producto por su clave primaria local (id), si no está borrado.
 */
export async function obtenerPorId(
  db: DatabaseClient,
  id: number
): Promise<ProductoRow | null> {
  return await db.getFirstAsync<ProductoRow>(SQL_OBTENER_PRODUCTO_POR_ID, [id]);
}

/**
 * Obtiene un producto por su código de barras único, si no está borrado.
 */
export async function obtenerPorCodigo(
  db: DatabaseClient,
  codigo: string
): Promise<ProductoRow | null> {
  return await db.getFirstAsync<ProductoRow>(SQL_OBTENER_PRODUCTO_POR_CODIGO, [codigo]);
}

/**
 * Busca productos que coincidan por nombre o código de barras (con comodines %termino%).
 * 100% parametrizado contra inyecciones SQL.
 */
export async function buscar(
  db: DatabaseClient,
  termino: string
): Promise<ProductoRow[]> {
  const patron = `%${termino.trim()}%`;
  return await db.getAllAsync<ProductoRow>(SQL_BUSCAR_PRODUCTOS, [patron, patron]);
}

/**
 * Obtiene productos cuyo stock actual sea menor o igual al mínimo establecido (stock <= minimo).
 */
export async function obtenerBajoStock(
  db: DatabaseClient
): Promise<ProductoRow[]> {
  return await db.getAllAsync<ProductoRow>(SQL_OBTENER_BAJO_STOCK);
}

/**
 * Inserta un nuevo producto con bandera pending = 1 para sincronización offline.
 */
export async function crear(
  db: DatabaseClient,
  input: InputCrearProducto
): Promise<SQLiteRunResult> {
  const stock = input.stock ?? 0;
  const minimo = input.minimo ?? 3;
  const remoteId = input.remote_id ?? null;
  const updatedAt = input.updated_at ?? new Date().toISOString();

  return await db.runAsync(SQL_CREAR_PRODUCTO, [
    input.codigo,
    input.nombre,
    input.precio_centavos,
    stock,
    minimo,
    remoteId,
    updatedAt,
  ]);
}

/**
 * Actualiza el stock de un producto marcándolo como pendiente de sincronización (pending = 1).
 */
export async function actualizarStock(
  db: DatabaseClient,
  id: number,
  nuevoStock: number,
  updatedAt?: string
): Promise<SQLiteRunResult> {
  const fecha = updatedAt ?? new Date().toISOString();
  return await db.runAsync(SQL_ACTUALIZAR_STOCK, [nuevoStock, fecha, id]);
}

/**
 * Realiza un borrado lógico (soft delete: deleted = 1, pending = 1).
 */
export async function eliminarLogico(
  db: DatabaseClient,
  id: number,
  updatedAt?: string
): Promise<SQLiteRunResult> {
  const fecha = updatedAt ?? new Date().toISOString();
  return await db.runAsync(SQL_ELIMINAR_LOGICO_PRODUCTO, [fecha, id]);
}

export const productoRepository = {
  obtenerTodos,
  obtenerPorId,
  obtenerPorCodigo,
  buscar,
  obtenerBajoStock,
  crear,
  actualizarStock,
  eliminarLogico,
};
