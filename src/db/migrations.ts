/**
 * Migraciones de esquema y sembrado inicial para SQLite local.
 * Define la estructura de tablas y datos semilla según la Sección 8 de la planeación.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { PRODUCTOS_INICIALES } from '../services/mockInventario.ts';
import type { NuevoProductoRow } from './types.ts';
import { precioACentavos } from './types.ts';

export interface SQLiteDatabaseLike {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, params?: unknown): Promise<T | null>;
  runAsync(source: string, params?: unknown, ...variadic: unknown[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const SQL_CREAR_TABLA_PRODUCTO = `
CREATE TABLE IF NOT EXISTS producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  minimo INTEGER NOT NULL DEFAULT 3,
  remote_id TEXT,
  updated_at TEXT,
  deleted INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0
);
`.trim();

export const SQL_CREAR_TABLA_MOVIMIENTO_STOCK = `
CREATE TABLE IF NOT EXISTS movimiento_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  delta INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  remote_id TEXT,
  updated_at TEXT,
  deleted INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0
);
`.trim();

/**
 * Catálogo de productos semilla convertidos al formato snake_case de SQLite
 * con precios expresados en centavos enteros.
 */
export const PRODUCTOS_SEMILLA: NuevoProductoRow[] = PRODUCTOS_INICIALES.map((prod) => ({
  codigo: prod.codigoBarras,
  nombre: prod.nombre,
  precio_centavos: precioACentavos(prod.precio),
  stock: prod.stockActual,
  minimo: prod.stockMinimo,
  remote_id: prod.id,
  updated_at: prod.actualizadoEn,
  deleted: 0,
  pending: 0,
}));

/**
 * Inserta los productos iniciales en la base de datos si y solo si
 * no existe ningún producto registrado previamente.
 */
export async function sembrarDatosIniciales(
  db: SQLiteDatabase | SQLiteDatabaseLike
): Promise<number> {
  const resultado = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM producto;'
  );

  const total = resultado?.count ?? 0;
  if (total > 0) {
    return 0;
  }

  let insertados = 0;
  await db.withTransactionAsync(async () => {
    for (const prod of PRODUCTOS_SEMILLA) {
      await db.runAsync(
        `INSERT INTO producto (
          codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          prod.codigo,
          prod.nombre,
          prod.precio_centavos,
          prod.stock,
          prod.minimo,
          prod.remote_id,
          prod.updated_at,
          prod.deleted,
          prod.pending,
        ]
      );
      insertados++;
    }
  });

  return insertados;
}

/**
 * Aplica todas las migraciones DDL para crear las tablas necesarias
 * y ejecuta el sembrado inicial controlado.
 */
export async function aplicarMigraciones(
  db: SQLiteDatabase | SQLiteDatabaseLike
): Promise<void> {
  // Crear tablas en orden respetando dependencias de claves foráneas
  await db.execAsync(`
    ${SQL_CREAR_TABLA_PRODUCTO};
    ${SQL_CREAR_TABLA_MOVIMIENTO_STOCK};
  `);

  // Sembrado inicial si la tabla producto está vacía
  await sembrarDatosIniciales(db);
}
