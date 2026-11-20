/**
 * Servicio de sincronización offline-first para SQLite y API REST.
 * Implementa el protocolo de la Sección 9.3 de la planeación:
 * - Subida de cambios locales pendientes (pending = 1) con PUT y DELETE.
 * - Descarga de cambios remotos (GET /api/<recurso>?since=<ISO>) en lotes de máx 500.
 * - Resolución de conflictos con regla de última escritura (last-write-wins).
 * - Borrado lógico cuando deleted_at !== null.
 */

import { apiFetch, type ApiRequestOptions } from '../api/apiClient.ts';
import type { DatabaseClient, ProductoRow } from '../db/types.ts';
import { resolveDatabase } from './inventarioMappers.ts';

export interface ReporteSincronizacion {
  exito: boolean;
  subidos: number;
  descargados: number;
  error?: string;
}

export interface ProductoRemoto {
  id: string;
  codigo?: string | null;
  nombre: string;
  precio_centavos?: number;
  precio?: number;
  stock?: number;
  minimo?: number;
  updated_at: string;
  deleted_at?: string | null;
}

export type ApiFetchFunction = <T>(endpoint: string, options?: ApiRequestOptions) => Promise<T>;

export interface SincronizarOptions {
  db?: DatabaseClient;
  recurso?: string;
  since?: string;
  apiFetch?: ApiFetchFunction;
}

const TAMANO_LOTE = 500;
const RECURSO_POR_DEFECTO = 'productos';
const FECHA_ORIGEN_ISO = '1970-01-01T00:00:00.000Z';

export async function contarPendientesAsync(db?: DatabaseClient): Promise<number> {
  const cliente = await resolveDatabase(db);
  const resProd = await cliente.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM producto WHERE pending = 1;'
  );
  let total = resProd?.count ?? 0;
  try {
    const resMov = await cliente.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM movimiento_stock WHERE pending = 1;'
    );
    total += resMov?.count ?? 0;
  } catch {
    // movimiento_stock opcional
  }
  return total;
}

async function obtenerUltimoSync(db: DatabaseClient, recurso: string): Promise<string> {
  if (recurso === 'productos' || recurso === 'producto') {
    const res = await db.getFirstAsync<{ max_updated: string | null }>(
      'SELECT MAX(updated_at) as max_updated FROM producto WHERE pending = 0;'
    );
    if (res?.max_updated) return res.max_updated;
  }
  return FECHA_ORIGEN_ISO;
}

async function subirPendientes(
  db: DatabaseClient,
  recurso: string,
  fetcher: ApiFetchFunction
): Promise<number> {
  const pendientes = await db.getAllAsync<ProductoRow>('SELECT * FROM producto WHERE pending = 1;');
  let subidos = 0;

  for (const item of pendientes) {
    const idRecurso = item.remote_id && item.remote_id.trim().length > 0 ? item.remote_id : String(item.id);

    if (item.deleted === 1) {
      const res = await fetcher<{ updated_at?: string }>(`/api/${recurso}/${idRecurso}`, { method: 'DELETE' });
      const serverUpdated = res?.updated_at ?? new Date().toISOString();
      await db.runAsync('UPDATE producto SET pending = 0, updated_at = ? WHERE id = ?;', [serverUpdated, item.id]);
    } else {
      const payload = {
        id: idRecurso,
        codigo: item.codigo,
        nombre: item.nombre,
        precio_centavos: item.precio_centavos,
        stock: item.stock,
        minimo: item.minimo,
        updated_at: item.updated_at,
      };
      const res = await fetcher<{ id?: string; updated_at?: string }>(`/api/${recurso}/${idRecurso}`, {
        method: 'PUT',
        body: payload,
      });
      const serverUpdated = res?.updated_at ?? item.updated_at ?? new Date().toISOString();
      const serverId = res?.id ?? item.remote_id ?? idRecurso;
      await db.runAsync(
        'UPDATE producto SET pending = 0, updated_at = ?, remote_id = ? WHERE id = ?;',
        [serverUpdated, serverId, item.id]
      );
    }
    subidos++;
  }
  return subidos;
}

async function procesarItemRemoto(db: DatabaseClient, item: ProductoRemoto): Promise<void> {
  const local = await db.getFirstAsync<ProductoRow>(
    'SELECT * FROM producto WHERE remote_id = ? OR (codigo IS NOT NULL AND codigo = ?) LIMIT 1;',
    [item.id, item.codigo ?? '']
  );
  const serverTime = new Date(item.updated_at).getTime();

  if (local) {
    const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
    if (serverTime >= localTime) {
      if (item.deleted_at !== null && item.deleted_at !== undefined) {
        await db.runAsync('UPDATE producto SET deleted = 1, pending = 0, updated_at = ? WHERE id = ?;', [
          item.updated_at,
          local.id,
        ]);
      } else {
        const precioCentavos = item.precio_centavos ?? (
          item.precio !== undefined ? Math.round(item.precio * 100) : local.precio_centavos
        );
        await db.runAsync(
          `UPDATE producto
           SET nombre = ?, codigo = ?, precio_centavos = ?, stock = ?, minimo = ?,
               remote_id = ?, updated_at = ?, deleted = 0, pending = 0
           WHERE id = ?;`,
          [
            item.nombre,
            item.codigo ?? local.codigo,
            precioCentavos,
            item.stock ?? local.stock,
            item.minimo ?? local.minimo,
            item.id,
            item.updated_at,
            local.id,
          ]
        );
      }
    }
  } else {
    const esBorrado = item.deleted_at !== null && item.deleted_at !== undefined;
    const precioCentavos = item.precio_centavos ?? (
      item.precio !== undefined ? Math.round(item.precio * 100) : 0
    );
    await db.runAsync(
      `INSERT INTO producto (
        codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        item.codigo ?? null,
        item.nombre,
        precioCentavos,
        item.stock ?? 0,
        item.minimo ?? 3,
        item.id,
        item.updated_at,
        esBorrado ? 1 : 0,
      ]
    );
  }
}

async function descargarCambios(
  db: DatabaseClient,
  recurso: string,
  fetcher: ApiFetchFunction,
  sinceParam?: string
): Promise<number> {
  const sinceISO = sinceParam ?? (await obtenerUltimoSync(db, recurso));
  let cursorSince = sinceISO;
  let continuar = true;
  let totalDescargados = 0;

  while (continuar) {
    const endpoint = `/api/${recurso}?since=${encodeURIComponent(cursorSince)}`;
    const recibidos = await fetcher<ProductoRemoto[]>(endpoint, { method: 'GET' });

    if (!Array.isArray(recibidos) || recibidos.length === 0) break;

    for (const item of recibidos) {
      await procesarItemRemoto(db, item);
      totalDescargados++;
      if (item.updated_at && item.updated_at > cursorSince) {
        cursorSince = item.updated_at;
      }
    }

    if (recibidos.length < TAMANO_LOTE) continuar = false;
  }
  return totalDescargados;
}

export async function sincronizar(options: SincronizarOptions = {}): Promise<ReporteSincronizacion> {
  let subidos = 0;
  let descargados = 0;
  try {
    const db = await resolveDatabase(options.db);
    const recurso = options.recurso ?? RECURSO_POR_DEFECTO;
    const fetcher = options.apiFetch ?? apiFetch;

    subidos = await subirPendientes(db, recurso, fetcher);
    descargados = await descargarCambios(db, recurso, fetcher, options.since);

    return { exito: true, subidos, descargados };
  } catch (err) {
    return {
      exito: false,
      subidos,
      descargados,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const sincronizacionService = {
  sincronizar,
  contarPendientesAsync,
};
