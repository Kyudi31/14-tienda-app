/**
 * Módulo de conexión e inicialización de SQLite con la API moderna de expo-sqlite.
 * Cumple con los requerimientos de la Sección 8 de la planeación.
 */

import * as SQLite from 'expo-sqlite';
import { aplicarMigraciones } from './migrations.ts';

export const DATABASE_NAME = 'tienda.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Inicializa la base de datos SQLite:
 * - Abre 'tienda.db' mediante SQLite.openDatabaseAsync.
 * - Habilita PRAGMA journal_mode = WAL y PRAGMA foreign_keys = ON.
 * - Aplica las migraciones de tablas y sembrado inicial.
 */
export async function inicializarBD(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Habilitar PRAGMA foreign_keys = ON y PRAGMA journal_mode = WAL
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // Ejecutar migraciones de esquema y sembrado inicial
    await aplicarMigraciones(db);

    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

/**
 * Retorna la base de datos abierta e inicializada.
 * Si aún no ha sido inicializada, ejecuta inicializarBD().
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  return inicializarBD();
}

/**
 * Acceso sincrónico a la instancia de base de datos una vez inicializada.
 * Lanza un error explícito si no se ha llamado a inicializarBD().
 */
export function getDatabaseSync(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error(
      'La base de datos aún no ha sido inicializada. Invoca primero inicializarBD().'
    );
  }
  return dbInstance;
}

/**
 * Cierra la conexión de base de datos y restablece el estado para pruebas o recargas.
 */
export async function cerrarBD(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
}
