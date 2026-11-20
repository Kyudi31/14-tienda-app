import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, it } from 'node:test';

import {
  SQL_CREAR_TABLA_MOVIMIENTO_STOCK,
  SQL_CREAR_TABLA_PRODUCTO,
} from '../../db/migrations.ts';
import type { DatabaseClient, SQLiteRunResult } from '../../db/types.ts';
import {
  movimientoRepository,
  SQL_OBTENER_MOVIMIENTOS_POR_PRODUCTO,
  SQL_OBTENER_TODOS_MOVIMIENTOS,
  SQL_REGISTRAR_MOVIMIENTO,
} from '../../repositories/movimientoRepository.ts';
import {
  productoRepository,
  SQL_ACTUALIZAR_STOCK,
  SQL_BUSCAR_PRODUCTOS,
  SQL_CREAR_PRODUCTO,
  SQL_ELIMINAR_LOGICO_PRODUCTO,
  SQL_OBTENER_BAJO_STOCK,
  SQL_OBTENER_PRODUCTO_POR_CODIGO,
  SQL_OBTENER_PRODUCTO_POR_ID,
  SQL_OBTENER_TODOS_PRODUCTOS,
} from '../../repositories/productoRepository.ts';

function crearDbEnMemoria(): DatabaseClient {
  const db = new DatabaseSync(':memory:');
  db.exec(SQL_CREAR_TABLA_PRODUCTO);
  db.exec(SQL_CREAR_TABLA_MOVIMIENTO_STOCK);

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

describe('Suite de Pruebas Unitarias - Repositorios SQLite (Secciones 3, 8 y 9.2)', () => {
  let db: DatabaseClient;

  beforeEach(() => {
    db = crearDbEnMemoria();
  });

  it('Prueba 1: Constantes SQL usan 100% parámetros preparados y respetan especificación', () => {
    assert.ok(SQL_OBTENER_TODOS_PRODUCTOS.includes('WHERE deleted = 0'));
    assert.ok(SQL_OBTENER_TODOS_PRODUCTOS.includes('ORDER BY nombre ASC'));
    assert.ok(SQL_OBTENER_PRODUCTO_POR_ID.includes('WHERE id = ? AND deleted = 0'));
    assert.ok(SQL_OBTENER_PRODUCTO_POR_CODIGO.includes('WHERE codigo = ? AND deleted = 0'));
    assert.ok(SQL_BUSCAR_PRODUCTOS.includes('(nombre LIKE ? OR codigo LIKE ?) AND deleted = 0'));
    assert.ok(SQL_OBTENER_BAJO_STOCK.includes('WHERE stock <= minimo AND deleted = 0'));
    assert.ok(SQL_CREAR_PRODUCTO.includes('VALUES (?, ?, ?, ?, ?, ?, ?, 1)'));
    assert.ok(SQL_ACTUALIZAR_STOCK.includes('SET stock = ?, updated_at = ?, pending = 1'));
    assert.ok(SQL_ELIMINAR_LOGICO_PRODUCTO.includes('SET deleted = 1, updated_at = ?, pending = 1'));
    assert.ok(SQL_REGISTRAR_MOVIMIENTO.includes('VALUES (?, ?, ?, ?, ?, ?, 1)'));
    assert.ok(SQL_OBTENER_MOVIMIENTOS_POR_PRODUCTO.includes('WHERE producto_id = ? AND deleted = 0'));
    assert.ok(SQL_OBTENER_TODOS_MOVIMIENTOS.includes('JOIN producto p ON m.producto_id = p.id'));
    assert.ok(SQL_OBTENER_TODOS_MOVIMIENTOS.includes('LIMIT ?'));
  });

  it('Prueba 2: productoRepository.crear y consultas por ID y Código funcionan correctamente', async () => {
    const res = await productoRepository.crear(db, {
      codigo: '770111222333',
      nombre: 'Arroz Diana 1kg',
      precio_centavos: 380000,
      stock: 10,
      minimo: 3,
    });
    assert.strictEqual(res.changes, 1);
    assert.strictEqual(res.lastInsertRowId, 1);

    const porId = await productoRepository.obtenerPorId(db, 1);
    assert.ok(porId);
    assert.strictEqual(porId?.nombre, 'Arroz Diana 1kg');
    assert.strictEqual(porId?.codigo, '770111222333');
    assert.strictEqual(porId?.stock, 10);
    assert.strictEqual(porId?.minimo, 3);
    assert.strictEqual(porId?.precio_centavos, 380000);
    assert.strictEqual(porId?.pending, 1);
    assert.strictEqual(porId?.deleted, 0);

    const porCodigo = await productoRepository.obtenerPorCodigo(db, '770111222333');
    assert.strictEqual(porCodigo?.id, 1);
    assert.strictEqual(await productoRepository.obtenerPorId(db, 999), null);
    assert.strictEqual(await productoRepository.obtenerPorCodigo(db, 'INEXISTENTE'), null);
  });

  it('Prueba 3: Aislamiento estricto de borrados lógicos en todas las consultas de producto', async () => {
    await productoRepository.crear(db, {
      codigo: '111', nombre: 'Leche Entera', precio_centavos: 400000, stock: 2, minimo: 5,
    });
    await productoRepository.crear(db, {
      codigo: '222', nombre: 'Pan Tajado', precio_centavos: 250000, stock: 8, minimo: 3,
    });

    assert.strictEqual((await productoRepository.obtenerTodos(db)).length, 2);
    const borradoRes = await productoRepository.eliminarLogico(db, 1);
    assert.strictEqual(borradoRes.changes, 1);

    const despues = await productoRepository.obtenerTodos(db);
    assert.strictEqual(despues.length, 1);
    assert.strictEqual(despues[0]?.id, 2);

    assert.strictEqual(await productoRepository.obtenerPorId(db, 1), null);
    assert.strictEqual(await productoRepository.obtenerPorCodigo(db, '111'), null);
    assert.strictEqual((await productoRepository.buscar(db, 'Leche')).length, 0);

    const bajoStock = await productoRepository.obtenerBajoStock(db);
    assert.strictEqual(bajoStock.some((p) => p.id === 1), false);
  });

  it('Prueba 4: Búsqueda LIKE parametrizada filtra por nombre y código y es inmune a inyección', async () => {
    await productoRepository.crear(db, {
      codigo: '7701234567890', nombre: 'Café Colombiano Molido', precio_centavos: 850000, stock: 15, minimo: 5,
    });
    await productoRepository.crear(db, {
      codigo: '7709876543210', nombre: 'Azúcar Blanca Especial', precio_centavos: 320000, stock: 20, minimo: 4,
    });

    const porNombre = await productoRepository.buscar(db, 'colombiano');
    assert.strictEqual(porNombre.length, 1);
    assert.strictEqual(porNombre[0]?.nombre, 'Café Colombiano Molido');

    const porCodigo = await productoRepository.buscar(db, '987654');
    assert.strictEqual(porCodigo.length, 1);
    assert.strictEqual(porCodigo[0]?.nombre, 'Azúcar Blanca Especial');

    assert.strictEqual((await productoRepository.buscar(db, '770')).length, 2);
    assert.strictEqual((await productoRepository.buscar(db, 'Aceite')).length, 0);

    // Vector de inyección SQL debe tratarse como literal sin efectos secundarios
    const resultadoSeguro = await productoRepository.buscar(db, "' OR '1'='1");
    assert.strictEqual(resultadoSeguro.length, 0);
  });

  it('Prueba 5: obtenerBajoStock identifica stock <= minimo y respeta los límites', async () => {
    await productoRepository.crear(db, {
      codigo: 'P1', nombre: 'Producto Crítico', precio_centavos: 10000, stock: 1, minimo: 3,
    });
    await productoRepository.crear(db, {
      codigo: 'P2', nombre: 'Producto En Limite', precio_centavos: 20000, stock: 4, minimo: 4,
    });
    await productoRepository.crear(db, {
      codigo: 'P3', nombre: 'Producto Normal', precio_centavos: 30000, stock: 10, minimo: 2,
    });

    const bajoStock = await productoRepository.obtenerBajoStock(db);
    assert.strictEqual(bajoStock.length, 2);
    const nombres = bajoStock.map((p) => p.nombre);
    assert.ok(nombres.includes('Producto Crítico'));
    assert.ok(nombres.includes('Producto En Limite'));
    assert.strictEqual(nombres.includes('Producto Normal'), false);
  });

  it('Prueba 6: actualizarStock actualiza valor, pending = 1 y timestamp', async () => {
    await productoRepository.crear(db, {
      codigo: 'P-STOCK',
      nombre: 'Aceite de Girasol',
      precio_centavos: 900000,
      stock: 5,
      minimo: 2,
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const res = await productoRepository.actualizarStock(db, 1, 12, '2026-11-20T12:00:00.000Z');
    assert.strictEqual(res.changes, 1);

    const prod = await productoRepository.obtenerPorId(db, 1);
    assert.strictEqual(prod?.stock, 12);
    assert.strictEqual(prod?.pending, 1);
    assert.strictEqual(prod?.updated_at, '2026-11-20T12:00:00.000Z');
  });

  it('Prueba 7: movimientoRepository registra y consulta con join, orden y límite', async () => {
    await productoRepository.crear(db, {
      codigo: 'P-MOV', nombre: 'Chocolate en Polvo', precio_centavos: 550000, stock: 10, minimo: 3,
    });

    const mov1 = await movimientoRepository.registrar(db, {
      producto_id: 1, delta: 5, motivo: 'Compra a distribuidor', fecha: '2026-11-19T10:00:00.000Z',
    });
    assert.strictEqual(mov1.changes, 1);

    const mov2 = await movimientoRepository.registrar(db, {
      producto_id: 1, delta: -2, motivo: 'Venta mostrador', fecha: '2026-11-20T15:00:00.000Z',
    });
    assert.strictEqual(mov2.changes, 1);

    const porProducto = await movimientoRepository.obtenerPorProducto(db, 1);
    assert.strictEqual(porProducto.length, 2);
    assert.strictEqual(porProducto[0]?.fecha, '2026-11-20T15:00:00.000Z');
    assert.strictEqual(porProducto[0]?.delta, -2);
    assert.strictEqual(porProducto[1]?.fecha, '2026-11-19T10:00:00.000Z');
    assert.strictEqual(porProducto[1]?.delta, 5);

    const todos = await movimientoRepository.obtenerTodos(db, 10);
    assert.strictEqual(todos.length, 2);
    assert.strictEqual(todos[0]?.producto_nombre, 'Chocolate en Polvo');
    assert.strictEqual(todos[0]?.delta, -2);

    const limitados = await movimientoRepository.obtenerTodos(db, 1);
    assert.strictEqual(limitados.length, 1);
    assert.strictEqual(limitados[0]?.delta, -2);
  });

  it('Prueba 8: Spy de base de datos confirma paso seguro de parámetros y cero inyecciones', async () => {
    const executed: { sql: string; params?: unknown }[] = [];
    const spyDb: DatabaseClient = {
      async getAllAsync<T>(sql: string, params?: (string | number | null | boolean)[]) {
        executed.push({ sql, params });
        return [] as T[];
      },
      async getFirstAsync<T>(sql: string, params?: (string | number | null | boolean)[]) {
        executed.push({ sql, params });
        return null;
      },
      async runAsync(sql: string, params?: (string | number | null | boolean)[]) {
        executed.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    };

    await productoRepository.buscar(spyDb, "term';--");
    assert.strictEqual(executed.length, 1);
    assert.deepStrictEqual(executed[0]?.params, ["%term';--%", "%term';--%"]);

    await productoRepository.actualizarStock(spyDb, 42, 99, '2026-11-20T00:00:00Z');
    assert.strictEqual(executed.length, 2);
    assert.deepStrictEqual(executed[1]?.params, [99, '2026-11-20T00:00:00Z', 42]);
  });
});
