import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, it } from 'node:test';

import {
  SQL_CREAR_TABLA_MOVIMIENTO_STOCK,
  SQL_CREAR_TABLA_PRODUCTO,
} from '../../db/migrations.ts';
import type { DatabaseClient, ProductoRow, SQLiteRunResult } from '../../db/types.ts';
import {
  calcularMagnitudAceleracion,
  DEFAULT_SHAKE_COOLDOWN_MS,
  DEFAULT_SHAKE_THRESHOLD,
  esSacudida,
} from '../../sensors/shakeDetector.ts';
import {
  ajustarStockAsync,
  deshacerUltimoMovimientoAsync,
  setDatabaseClient,
} from '../inventario.ts';

function crearDbTest(): DatabaseClient {
  const db = new DatabaseSync(':memory:');
  db.exec(SQL_CREAR_TABLA_PRODUCTO);
  db.exec(SQL_CREAR_TABLA_MOVIMIENTO_STOCK);

  db.exec(`
    INSERT INTO producto (id, codigo, nombre, precio_centavos, stock, minimo, remote_id, updated_at, deleted, pending)
    VALUES
      (1, '7701234567890', 'Leche Entera 1L', 380000, 10, 5, 'prod-1', '2026-11-20T08:00:00Z', 0, 0),
      (2, '7702345678901', 'Arroz Blanco 1kg', 450000, 10, 4, 'prod-2', '2026-11-20T08:15:00Z', 0, 0);
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

describe('Suite de Pruebas Unitarias - Detección de Sacudida (Sección 5 y 11)', () => {
  it('Prueba 1: calcularMagnitudAceleracion calcula la norma euclidiana del vector 3D', () => {
    // Reposo horizontal: gravedad en eje Z = 1.0G
    const reposo = calcularMagnitudAceleracion({ x: 0, y: 0, z: 1 });
    assert.strictEqual(reposo, 1.0);

    // Vector específico conocido: √(1² + 2² + 2²) = √9 = 3.0
    const conocido = calcularMagnitudAceleracion({ x: 1, y: 2, z: 2 });
    assert.strictEqual(conocido, 3.0);
  });

  it('Prueba 2: esSacudida descarta lecturas en reposo que no superen el umbral', () => {
    const reposo = { x: 0, y: 0.98, z: 0.1 };
    const ahora = 10000;
    const ultimoDisparo = 0;

    const detectado = esSacudida(reposo, ultimoDisparo, ahora, DEFAULT_SHAKE_THRESHOLD);
    assert.strictEqual(detectado, false);
  });

  it('Prueba 3: esSacudida detecta aceleración que supera el umbral tras cooldown', () => {
    // Gesto de sacudida intensa: √(1.5² + 1.2² + 0.8²) = √(2.25 + 1.44 + 0.64) = √4.33 ≈ 2.08 > 1.8
    const sacudida = { x: 1.5, y: 1.2, z: 0.8 };
    const ahora = 15000;
    const ultimoDisparo = 10000; // 5000ms atrás (> cooldown 1000ms)

    const detectado = esSacudida(sacudida, ultimoDisparo, ahora, DEFAULT_SHAKE_THRESHOLD, DEFAULT_SHAKE_COOLDOWN_MS);
    assert.strictEqual(detectado, true);
  });

  it('Prueba 4: esSacudida bloquea disparos dobles durante el período de cooldown', () => {
    const sacudida = { x: 2.0, y: 2.0, z: 1.0 };
    const ultimoDisparo = 20000;
    const ahoraDuranteCooldown = 20400; // solo 400ms después (< 1000ms)

    const detectado = esSacudida(sacudida, ultimoDisparo, ahoraDuranteCooldown, DEFAULT_SHAKE_THRESHOLD, DEFAULT_SHAKE_COOLDOWN_MS);
    assert.strictEqual(detectado, false);

    const ahoraTrasCooldown = 21050; // 1050ms después (> 1000ms)
    const detectadoTrasCooldown = esSacudida(sacudida, ultimoDisparo, ahoraTrasCooldown, DEFAULT_SHAKE_THRESHOLD, DEFAULT_SHAKE_COOLDOWN_MS);
    assert.strictEqual(detectadoTrasCooldown, true);
  });
});

describe('Suite de Pruebas Unitarias - Lógica de Deshacer / Reversión en SQLite (Hito 3 - Tarea 3.3)', () => {
  let db: DatabaseClient;

  beforeEach(() => {
    db = crearDbTest();
    setDatabaseClient(db);
  });

  it('Prueba 5: deshacerUltimoMovimientoAsync rechaza con mensaje exacto si no hay movimientos', async () => {
    const res = await deshacerUltimoMovimientoAsync(db);
    assert.strictEqual(res.exito, false);
    assert.strictEqual(res.mensaje, 'No hay movimientos para deshacer');
  });

  it('Prueba 6: Revierte ENTRADA: resta X unidades, actualiza stock con pending=1 y registra auditoría', async () => {
    // Producto 1 tiene stock inicial 10. Realizamos ENTRADA de 5 unidades -> stock pasa a 15.
    const entrada = await ajustarStockAsync(1, 'ENTRADA', 5, 'Compra de stock adicional', db);
    assert.strictEqual(entrada.exito, true);
    assert.strictEqual(entrada.producto?.stockActual, 15);

    // Ejecutamos Deshacer
    const reversion = await deshacerUltimoMovimientoAsync(db);
    assert.strictEqual(reversion.exito, true);
    assert.strictEqual(reversion.producto?.stockActual, 10);
    assert.match(reversion.mensaje, /deshizo/i);

    // Verificamos estado persistido en SQLite
    const filaProd = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 1');
    assert.ok(filaProd);
    assert.strictEqual(filaProd.stock, 10);
    assert.strictEqual(filaProd.pending, 1);

    // Verificamos que se insertó el movimiento de reversión con pending = 1 y delta = -5
    const ultimoMov = await db.getFirstAsync<{ delta: number; pending: number; motivo: string }>(
      'SELECT delta, pending, motivo FROM movimiento_stock WHERE producto_id = 1 ORDER BY id DESC LIMIT 1'
    );
    assert.ok(ultimoMov);
    assert.strictEqual(ultimoMov.delta, -5);
    assert.strictEqual(ultimoMov.pending, 1);
    assert.match(ultimoMov.motivo, /Deshacer.*entrada/i);
  });

  it('Prueba 7: Revierte SALIDA: suma X unidades, actualiza stock con pending=1 y registra auditoría', async () => {
    // Producto 1 tiene stock 10. Realizamos SALIDA de 4 unidades -> stock pasa a 6.
    const salida = await ajustarStockAsync(1, 'SALIDA', 4, 'Venta en mostrador', db);
    assert.strictEqual(salida.exito, true);
    assert.strictEqual(salida.producto?.stockActual, 6);

    // Ejecutamos Deshacer
    const reversion = await deshacerUltimoMovimientoAsync(db);
    assert.strictEqual(reversion.exito, true);
    assert.strictEqual(reversion.producto?.stockActual, 10);

    // Verificamos persistencia en SQLite
    const filaProd = await db.getFirstAsync<ProductoRow>('SELECT * FROM producto WHERE id = 1');
    assert.ok(filaProd);
    assert.strictEqual(filaProd.stock, 10);
    assert.strictEqual(filaProd.pending, 1);

    // Movimiento de reversión debe tener delta = +4 y pending = 1
    const ultimoMov = await db.getFirstAsync<{ delta: number; pending: number; motivo: string }>(
      'SELECT delta, pending, motivo FROM movimiento_stock WHERE producto_id = 1 ORDER BY id DESC LIMIT 1'
    );
    assert.ok(ultimoMov);
    assert.strictEqual(ultimoMov.delta, 4);
    assert.strictEqual(ultimoMov.pending, 1);
    assert.match(ultimoMov.motivo, /Deshacer.*salida/i);
  });

  it('Prueba 8: Rechaza reversión si causaría stock negativo y no modifica la base de datos', async () => {
    // Producto 2 tiene stock 10. Hacemos ENTRADA de 5 -> stock 15.
    await ajustarStockAsync(2, 'ENTRADA', 5, 'Entrada temporal', db);

    // Supongamos que por otra operación o ajuste el stock se redujo drásticamente a 2 en la base de datos
    await db.runAsync('UPDATE producto SET stock = 2 WHERE id = 2');

    // Intentar deshacer la entrada de 5 unidades requeriría stock = 2 - 5 = -3 < 0
    const reversionRechazada = await deshacerUltimoMovimientoAsync(db);
    assert.strictEqual(reversionRechazada.exito, false);
    assert.match(reversionRechazada.mensaje, /negativo/i);

    // Confirmamos que el stock en SQLite no cambió (permanece en 2)
    const filaProd = await db.getFirstAsync<ProductoRow>('SELECT stock FROM producto WHERE id = 2');
    assert.ok(filaProd);
    assert.strictEqual(filaProd.stock, 2);
  });

  it('Prueba 9: Deshacer con productoId filtra y revierte únicamente el último movimiento de ese producto', async () => {
    // Movimiento 1 en Producto 1 (+5)
    await ajustarStockAsync(1, 'ENTRADA', 5, 'Entrada Prod 1', db);
    // Movimiento 2 en Producto 2 (+3)
    await ajustarStockAsync(2, 'ENTRADA', 3, 'Entrada Prod 2', db);

    // Deshacemos específicamente para el Producto 1
    const reversionProd1 = await deshacerUltimoMovimientoAsync(1, db);
    assert.strictEqual(reversionProd1.exito, true);
    assert.strictEqual(reversionProd1.producto?.id, '1');
    assert.strictEqual(reversionProd1.producto?.stockActual, 10); // Restaurado de 15 a 10

    // El Producto 2 debe seguir con su stock de 13 intacto
    const filaProd2 = await db.getFirstAsync<ProductoRow>('SELECT stock FROM producto WHERE id = 2');
    assert.ok(filaProd2);
    assert.strictEqual(filaProd2.stock, 13);
  });
});
