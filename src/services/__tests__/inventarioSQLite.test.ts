import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, it } from 'node:test';

import {
  SQL_CREAR_TABLA_MOVIMIENTO_STOCK,
  SQL_CREAR_TABLA_PRODUCTO,
} from '../../db/migrations.ts';
import type { DatabaseClient, SQLiteRunResult } from '../../db/types.ts';
import {
  ajustarStockAsync,
  buscarProductosAsync,
  crearProductoAsync,
  getMovimientosAsync,
  getMovimientosPorProductoAsync,
  getProductoByCodigoAsync,
  getProductoByIdAsync,
  getProductosAsync,
  setDatabaseClient,
  valorInventarioAsync,
} from '../inventario.ts';

function crearDbTest(): DatabaseClient {
  const db = new DatabaseSync(':memory:');
  db.exec(SQL_CREAR_TABLA_PRODUCTO);
  db.exec(SQL_CREAR_TABLA_MOVIMIENTO_STOCK);

  // Sembrar 2 productos de prueba
  db.exec(`
    INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
    VALUES
      (1, '7701234567890', 'Leche Entera 1L', 380000, 12, 5, 'prod-1', '2026-11-20T08:00:00Z', 0, 0),
      (2, '7702345678901', 'Arroz Blanco 1kg', 450000, 2, 4, 'prod-2', '2026-11-20T08:15:00Z', 0, 0);
  `);

  return {
    async getAllAsync<T>(source: string, params?: (string | number | null | boolean)[]): Promise<T[]> {
      const rows = db.prepare(source).all(...((params ?? []) as (string | number | null)[]));
      return rows as unknown as T[];
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

describe('Suite de Pruebas Unitarias - Servicio Inventario con SQLite (Hito 2 - Tarea 2.3)', () => {
  beforeEach(() => {
    const db = crearDbTest();
    setDatabaseClient(db);
  });

  it('Prueba 1: getProductosAsync carga los productos desde la base de datos SQLite', async () => {
    const productos = await getProductosAsync();
    assert.strictEqual(productos.length, 2);
    assert.strictEqual(productos[0]?.nombre, 'Arroz Blanco 1kg'); // Ordenado por nombre ASC
    assert.strictEqual(productos[1]?.nombre, 'Leche Entera 1L');
    assert.strictEqual(productos[0]?.precio, 4500);
    assert.strictEqual(productos[1]?.precio, 3800);
  });

  it('Prueba 2: buscarProductosAsync filtra por nombre o código en SQLite', async () => {
    const porNombre = await buscarProductosAsync('leche');
    assert.strictEqual(porNombre.length, 1);
    assert.strictEqual(porNombre[0]?.nombre, 'Leche Entera 1L');

    const porCodigo = await buscarProductosAsync('770234');
    assert.strictEqual(porCodigo.length, 1);
    assert.strictEqual(porCodigo[0]?.codigoBarras, '7702345678901');

    const vacio = await buscarProductosAsync('InexistenteXYZ');
    assert.strictEqual(vacio.length, 0);
  });

  it('Prueba 3: getProductoByIdAsync y getProductoByCodigoAsync resuelven registros en SQLite', async () => {
    const prodPorId = await getProductoByIdAsync(1);
    assert.ok(prodPorId);
    assert.strictEqual(prodPorId?.nombre, 'Leche Entera 1L');

    const prodPorRemoteId = await getProductoByIdAsync('prod-2');
    assert.ok(prodPorRemoteId);
    assert.strictEqual(prodPorRemoteId?.nombre, 'Arroz Blanco 1kg');

    const prodPorCodigo = await getProductoByCodigoAsync('7701234567890');
    assert.ok(prodPorCodigo);
    assert.strictEqual(prodPorCodigo?.id, '1');

    const noExiste = await getProductoByIdAsync(999);
    assert.strictEqual(noExiste, null);
  });

  it('Prueba 4: Criterio 1 - Dado stock 2, al sacar 3 se rechaza y no permite stock negativo en SQLite', async () => {
    const resultadoInvalido = await ajustarStockAsync(2, 'SALIDA', 3, 'Intento de venta sin stock');
    assert.strictEqual(resultadoInvalido.exito, false);
    assert.match(resultadoInvalido.mensaje, /insuficiente|no puede quedar negativo/i);

    // Comprobar que en SQLite el stock sigue intacto en 2
    const prodDespues = await getProductoByIdAsync(2);
    assert.strictEqual(prodDespues?.stockActual, 2);

    // Ajuste válido: Entrada de 5 unidades -> Stock debe ser 7
    const resultadoValido = await ajustarStockAsync(2, 'ENTRADA', 5, 'Llegada de pedido');
    assert.strictEqual(resultadoValido.exito, true);
    assert.strictEqual(resultadoValido.producto?.stockActual, 7);

    const prodConfirmado = await getProductoByIdAsync(2);
    assert.strictEqual(prodConfirmado?.stockActual, 7);
  });

  it('Prueba 5: crearProductoAsync valida código único y precio, e inserta en SQLite con movimiento inicial', async () => {
    // Intento con código duplicado
    const duplicado = await crearProductoAsync({
      codigoBarras: '7701234567890',
      nombre: 'Leche Clonada',
      precio: 3500,
      stockActual: 5,
    });
    assert.strictEqual(duplicado.exito, false);
    assert.ok(duplicado.errores?.codigoBarras);

    // Alta exitosa
    const nuevo = await crearProductoAsync({
      codigoBarras: '7709999999999',
      nombre: 'Aceite de Oliva 500ml',
      categoria: 'Abarrotes',
      precio: 14500,
      stockActual: 8,
      stockMinimo: 2,
    });
    assert.strictEqual(nuevo.exito, true);
    assert.strictEqual(nuevo.producto?.nombre, 'Aceite de Oliva 500ml');

    const enBD = await getProductoByCodigoAsync('7709999999999');
    assert.ok(enBD);
    assert.strictEqual(enBD?.stockActual, 8);
    assert.strictEqual(enBD?.precio, 14500);

    // Movimiento inicial debe haberse registrado
    const movs = await getMovimientosPorProductoAsync(enBD?.id ?? '');
    assert.strictEqual(movs.length, 1);
    assert.strictEqual(movs[0]?.tipo, 'ENTRADA');
    assert.strictEqual(movs[0]?.cantidad, 8);
  });

  it('Prueba 6: getMovimientosAsync lista movimientos y valorInventarioAsync calcula el total', async () => {
    await ajustarStockAsync(1, 'SALIDA', 2, 'Venta en caja');
    const movimientos = await getMovimientosAsync();
    assert.ok(movimientos.length >= 1);
    assert.strictEqual(movimientos[0]?.productoNombre, 'Leche Entera 1L');
    assert.strictEqual(movimientos[0]?.tipo, 'SALIDA');
    assert.strictEqual(movimientos[0]?.cantidad, 2);

    // Total: (Leche: 10 * 3800 = 38000) + (Arroz: 2 * 4500 = 9000) = 47000
    const total = await valorInventarioAsync();
    assert.strictEqual(total, 47000);
  });
});
