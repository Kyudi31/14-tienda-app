/**
 * Suite de Pruebas Unitarias para Cliente API y Sincronización Offline-First (Hito 3 - Tarea 3.4).
 * Valida Secciones 9.1 y 9.3 de la planeación:
 * - Reintento transparente con refresh token ante 401.
 * - Limpieza de sesión cuando refresh falla ante 401.
 * - Subida de cambios pendientes (pending = 1) con PUT y DELETE.
 * - Resolución de conflictos con regla de última escritura (servidor gana ante mayor updated_at).
 * - Borrado lógico cuando el servidor retorna deleted_at.
 */

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ApiError, apiFetch, type ApiRequestOptions } from '../../api/apiClient.ts';
import { authStorage } from '../../api/authStorage.ts';
import { SQL_CREAR_TABLA_MOVIMIENTO_STOCK, SQL_CREAR_TABLA_PRODUCTO } from '../../db/migrations.ts';
import type { DatabaseClient, ProductoRow, SQLiteRunResult } from '../../db/types.ts';
import { type ProductoRemoto, sincronizar } from '../sincronizacionService.ts';

function crearDbTest(): DatabaseClient {
  const db = new DatabaseSync(':memory:');
  db.exec(SQL_CREAR_TABLA_PRODUCTO);
  db.exec(SQL_CREAR_TABLA_MOVIMIENTO_STOCK);

  return {
    async getAllAsync<T>(source: string, params?: (string | number | null | boolean)[]): Promise<T[]> {
      return db.prepare(source).all(...((params ?? []) as (string | number | null)[])) as unknown as T[];
    },
    async getFirstAsync<T>(source: string, params?: (string | number | null | boolean)[]): Promise<T | null> {
      const row = db.prepare(source).get(...((params ?? []) as (string | number | null)[]));
      return (row ?? null) as unknown as T | null;
    },
    async runAsync(source: string, params?: (string | number | null | boolean)[]): Promise<SQLiteRunResult> {
      const res = db.prepare(source).run(...((params ?? []) as (string | number | null)[]));
      return { changes: Number(res.changes), lastInsertRowId: Number(res.lastInsertRowid) };
    },
  };
}

describe('Suite de Pruebas Unitarias - Cliente API y Protocolo de Sincronización (Hito 3 - Tarea 3.4)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await authStorage.limpiarSesion();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('Prueba 1: apiFetch reintenta con nuevo token tras recibir 401 y resolver refresh exitoso', async () => {
    await authStorage.guardarTokens({ token: 'token-expirado-111', refreshToken: 'refresh-valido-222' });
    const llamadas: { url: string; authHeader: string | null }[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const authHeader = new Headers(init?.headers).get('Authorization');
      llamadas.push({ url, authHeader });

      if (url.includes('/api/auth/refresh')) {
        const parsed = JSON.parse(String(init?.body || '{}')) as { refreshToken?: string };
        assert.strictEqual(parsed.refreshToken, 'refresh-valido-222');
        return new Response(
          JSON.stringify({ token: 'token-renovado-333', refreshToken: 'refresh-nuevo-444' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/productos')) {
        if (authHeader === 'Bearer token-expirado-111') {
          return new Response(JSON.stringify({ error: 'Token expirado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (authHeader === 'Bearer token-renovado-333') {
          return new Response(
            JSON.stringify([{ id: 'prod-1', nombre: 'Arroz Diana 1kg' }]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const data = await apiFetch<Array<{ id: string; nombre: string }>>('/api/productos');
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0]?.nombre, 'Arroz Diana 1kg');
    assert.strictEqual(llamadas.length, 3);
    assert.strictEqual(llamadas[0]?.authHeader, 'Bearer token-expirado-111');
    assert.ok(llamadas[1]?.url.includes('/api/auth/refresh'));
    assert.strictEqual(llamadas[2]?.authHeader, 'Bearer token-renovado-333');

    const tokensEnStorage = await authStorage.obtenerTokens();
    assert.strictEqual(tokensEnStorage?.token, 'token-renovado-333');
    assert.strictEqual(tokensEnStorage?.refreshToken, 'refresh-nuevo-444');
  });

  it('Prueba 2: apiFetch limpia sesión si el refresh falla ante 401', async () => {
    await authStorage.guardarTokens({ token: 'token-invalido', refreshToken: 'refresh-revocado' });
    await authStorage.guardarUsuario({ id: 'user-1', email: 'tienda@barrio.co' });

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      const errorMsg = url.includes('/api/auth/refresh') ? 'Refresh revocado' : 'Token no válido';
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    await assert.rejects(
      async () => { await apiFetch('/api/productos'); },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual((err as ApiError).status, 401);
        return true;
      }
    );

    const tokensRestantes = await authStorage.obtenerTokens();
    assert.strictEqual(tokensRestantes, null);
  });

  it('Prueba 3: sincronizacionService sube registros con pending = 1 y los actualiza a pending = 0', async () => {
    const db = crearDbTest();
    await db.runAsync(
      `INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
       VALUES (1, '7701234567890', 'Leche Alpina 1L', 420000, 8, 3, 'prod-remoto-1', '2026-11-20T08:00:00.000Z', 0, 1);`
    );
    await db.runAsync(
      `INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
       VALUES (2, '7709876543210', 'Galletas Club', 150000, 0, 2, 'prod-remoto-2', '2026-11-20T08:10:00.000Z', 1, 1);`
    );

    const mockApiFetch = async <T>(endpoint: string, options?: ApiRequestOptions): Promise<T> => {
      if (endpoint === '/api/productos/prod-remoto-1' && options?.method === 'PUT') {
        return { id: 'prod-remoto-1', updated_at: '2026-11-20T09:00:00.000Z' } as unknown as T;
      }
      if (endpoint === '/api/productos/prod-remoto-2' && options?.method === 'DELETE') {
        return { updated_at: '2026-11-20T09:10:00.000Z' } as unknown as T;
      }
      if (endpoint.startsWith('/api/productos?since=')) {
        return [] as unknown as T;
      }
      throw new Error(`Endpoint inesperado: ${endpoint}`);
    };

    const reporte = await sincronizar({ db, apiFetch: mockApiFetch });
    assert.strictEqual(reporte.exito, true);
    assert.strictEqual(reporte.subidos, 2);
    assert.strictEqual(reporte.descargados, 0);

    const prod1 = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 1;');
    assert.ok(prod1);
    assert.strictEqual(prod1.pending, 0);
    assert.strictEqual(prod1.updated_at, '2026-11-20T09:00:00.000Z');

    const prod2 = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 2;');
    assert.ok(prod2);
    assert.strictEqual(prod2.pending, 0);
    assert.strictEqual(prod2.deleted, 1);
    assert.strictEqual(prod2.updated_at, '2026-11-20T09:10:00.000Z');
  });

  it('Prueba 4: sincronizacionService aplica regla de última escritura (servidor gana ante updated_at mayor)', async () => {
    const db = crearDbTest();
    await db.runAsync(
      `INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
       VALUES (1, '7701111111111', 'Arroz Local Antiguo', 300000, 4, 2, 'prod-arroz', '2026-11-20T08:00:00.000Z', 0, 0);`
    );
    await db.runAsync(
      `INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
       VALUES (2, '7702222222222', 'Aceite Local Reciente', 950000, 12, 3, 'prod-aceite', '2026-11-20T12:00:00.000Z', 0, 0);`
    );
    await db.runAsync(
      `INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
       VALUES (3, '7703333333333', 'Pan Tajado Local', 400000, 6, 2, 'prod-pan', '2026-11-20T08:00:00.000Z', 0, 0);`
    );

    const catalogoRemoto: ProductoRemoto[] = [
      {
        id: 'prod-arroz',
        codigo: '7701111111111',
        nombre: 'Arroz Servidor Actualizado',
        precio_centavos: 360000,
        stock: 25,
        minimo: 5,
        updated_at: '2026-11-20T10:00:00.000Z', // Gana servidor (10:00 > 08:00)
        deleted_at: null,
      },
      {
        id: 'prod-aceite',
        codigo: '7702222222222',
        nombre: 'Aceite Servidor Viejo',
        precio_centavos: 800000,
        stock: 2,
        minimo: 3,
        updated_at: '2026-11-20T09:00:00.000Z', // Gana local (12:00 > 09:00)
        deleted_at: null,
      },
      {
        id: 'prod-pan',
        codigo: '7703333333333',
        nombre: 'Pan Tajado',
        precio_centavos: 400000,
        stock: 0,
        minimo: 2,
        updated_at: '2026-11-20T10:30:00.000Z', // Borrado lógico (deleted_at !== null)
        deleted_at: '2026-11-20T10:30:00.000Z',
      },
    ];

    const mockApiFetch = async <T>(endpoint: string): Promise<T> => {
      if (endpoint.startsWith('/api/productos?since=')) return catalogoRemoto as unknown as T;
      return [] as unknown as T;
    };

    const reporte = await sincronizar({ db, apiFetch: mockApiFetch });
    assert.strictEqual(reporte.exito, true);
    assert.strictEqual(reporte.descargados, 3);

    const arroz = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 1;');
    assert.ok(arroz);
    assert.strictEqual(arroz.nombre, 'Arroz Servidor Actualizado');
    assert.strictEqual(arroz.stock, 25);
    assert.strictEqual(arroz.precio_centavos, 360000);
    assert.strictEqual(arroz.updated_at, '2026-11-20T10:00:00.000Z');

    const aceite = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 2;');
    assert.ok(aceite);
    assert.strictEqual(aceite.nombre, 'Aceite Local Reciente');
    assert.strictEqual(aceite.stock, 12);
    assert.strictEqual(aceite.updated_at, '2026-11-20T12:00:00.000Z');

    const pan = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 3;');
    assert.ok(pan);
    assert.strictEqual(pan.deleted, 1);
    assert.strictEqual(pan.updated_at, '2026-11-20T10:30:00.000Z');
  });

  it('Prueba 5: authStorage almacena tokens y usuario con fallback en memoria seguro', async () => {
    await authStorage.guardarTokens({ token: 't1', refreshToken: 'r1' });
    await authStorage.guardarUsuario({ id: 'u1', email: 'test@tienda.com', rol: 'admin' });

    const tokens = await authStorage.obtenerTokens();
    const usuario = await authStorage.obtenerUsuario();

    assert.deepStrictEqual(tokens, { token: 't1', refreshToken: 'r1' });
    assert.strictEqual(usuario?.id, 'u1');
    assert.strictEqual(usuario?.email, 'test@tienda.com');

    await authStorage.eliminarTokens();
    const tokensVacios = await authStorage.obtenerTokens();
    assert.strictEqual(tokensVacios, null);

    const usuarioAunExiste = await authStorage.obtenerUsuario();
    assert.strictEqual(usuarioAunExiste?.id, 'u1');

    await authStorage.limpiarSesion();
    const usuarioVacio = await authStorage.obtenerUsuario();
    assert.strictEqual(usuarioVacio, null);
  });
});
