import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  aplicarMigraciones,
  PRODUCTOS_SEMILLA,
  sembrarDatosIniciales,
  SQL_CREAR_TABLA_MOVIMIENTO_STOCK,
  SQL_CREAR_TABLA_PRODUCTO,
  type SQLiteDatabaseLike,
} from '../../db/migrations.ts';
import { centavosAPrecio, precioACentavos } from '../../db/types.ts';
import { PRODUCTOS_INICIALES } from '../mockInventario.ts';

describe('Suite de Pruebas Unitarias - Modelo y Migraciones SQLite (Sección 8 y 9.2)', () => {
  it('Prueba 1: DDL de producto contiene las columnas y restricciones exactas de la Sección 8', () => {
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('CREATE TABLE IF NOT EXISTS producto'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('id INTEGER PRIMARY KEY AUTOINCREMENT'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('codigo TEXT UNIQUE'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('nombre TEXT NOT NULL'));
    assert.ok(
      SQL_CREAR_TABLA_PRODUCTO.includes(
        'precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0)'
      )
    );
    assert.ok(
      SQL_CREAR_TABLA_PRODUCTO.includes('stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)')
    );
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('minimo INTEGER NOT NULL DEFAULT 3'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('remote_id TEXT'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('updated_at TEXT'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('deleted INTEGER DEFAULT 0'));
    assert.ok(SQL_CREAR_TABLA_PRODUCTO.includes('pending INTEGER DEFAULT 0'));
  });

  it('Prueba 2: DDL de movimiento_stock contiene la clave foránea y campos requeridos', () => {
    assert.ok(SQL_CREAR_TABLA_MOVIMIENTO_STOCK.includes('CREATE TABLE IF NOT EXISTS movimiento_stock'));
    assert.ok(
      SQL_CREAR_TABLA_MOVIMIENTO_STOCK.includes(
        'producto_id INTEGER NOT NULL REFERENCES producto(id)'
      )
    );
    assert.ok(SQL_CREAR_TABLA_MOVIMIENTO_STOCK.includes('delta INTEGER NOT NULL'));
    assert.ok(SQL_CREAR_TABLA_MOVIMIENTO_STOCK.includes('motivo TEXT NOT NULL'));
    assert.ok(SQL_CREAR_TABLA_MOVIMIENTO_STOCK.includes('fecha TEXT NOT NULL'));
  });

  it('Prueba 3: Funciones de utilidad precioACentavos y centavosAPrecio preservan la precisión', () => {
    assert.strictEqual(precioACentavos(3800), 380000);
    assert.strictEqual(centavosAPrecio(380000), 3800);

    assert.strictEqual(precioACentavos(12.5), 1250);
    assert.strictEqual(centavosAPrecio(1250), 12.5);

    assert.strictEqual(precioACentavos(0), 0);
    assert.strictEqual(centavosAPrecio(0), 0);
  });

  it('Prueba 4: Catálogo semilla PRODUCTOS_SEMILLA mapea correctamente los productos iniciales', () => {
    assert.strictEqual(PRODUCTOS_SEMILLA.length, PRODUCTOS_INICIALES.length);
    assert.ok(PRODUCTOS_SEMILLA.length > 0);

    for (let i = 0; i < PRODUCTOS_SEMILLA.length; i++) {
      const semilla = PRODUCTOS_SEMILLA[i]!;
      const original = PRODUCTOS_INICIALES[i]!;

      assert.strictEqual(semilla.codigo, original.codigoBarras);
      assert.strictEqual(semilla.nombre, original.nombre);
      assert.strictEqual(semilla.stock, original.stockActual);
      assert.strictEqual(semilla.minimo, original.stockMinimo);
      assert.strictEqual(semilla.precio_centavos, precioACentavos(original.precio));
      assert.strictEqual(semilla.deleted, 0);
      assert.strictEqual(semilla.pending, 0);
    }
  });

  it('Prueba 5: sembrarDatosIniciales inserta los productos si la tabla está vacía y evita duplicación', async () => {
    const executedQueries: string[] = [];
    const insertedRows: unknown[][] = [];
    let rowCount = 0;

    const mockDb: SQLiteDatabaseLike = {
      async execAsync(sql: string) {
        executedQueries.push(sql);
      },
      async getFirstAsync<T>() {
        return { count: rowCount } as T;
      },
      async runAsync(_sql: string, params?: unknown) {
        if (Array.isArray(params)) {
          insertedRows.push(params);
        }
        return { changes: 1, lastInsertRowId: insertedRows.length };
      },
      async withTransactionAsync(task: () => Promise<void>) {
        await task();
      },
    };

    // Primer sembrado: base de datos vacía
    const insertados = await sembrarDatosIniciales(mockDb);
    assert.strictEqual(insertados, PRODUCTOS_SEMILLA.length);
    assert.strictEqual(insertedRows.length, PRODUCTOS_SEMILLA.length);

    // Simular que ahora la tabla tiene filas
    rowCount = insertados;

    // Segundo sembrado: no debe insertar nada adicional
    const segundoIntento = await sembrarDatosIniciales(mockDb);
    assert.strictEqual(segundoIntento, 0, 'No debe resembrar si ya existen productos');
  });

  it('Prueba 6: aplicarMigraciones ejecuta DDL de ambas tablas y el sembrado inicial', async () => {
    let ddlEjecutado = '';
    let sembradoEjecutado = false;

    const mockDb: SQLiteDatabaseLike = {
      async execAsync(sql: string) {
        ddlEjecutado += sql;
      },
      async getFirstAsync<T>() {
        return { count: 0 } as T;
      },
      async runAsync() {
        sembradoEjecutado = true;
        return { changes: 1 };
      },
      async withTransactionAsync(task: () => Promise<void>) {
        await task();
      },
    };

    await aplicarMigraciones(mockDb);

    assert.ok(ddlEjecutado.includes('producto'), 'Debe crear tabla producto');
    assert.ok(ddlEjecutado.includes('movimiento_stock'), 'Debe crear tabla movimiento_stock');
    assert.strictEqual(sembradoEjecutado, true, 'Debe sembrar datos iniciales');
  });
});
