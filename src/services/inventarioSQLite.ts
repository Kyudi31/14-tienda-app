/**
 * Servicio de Inventario con persistencia en SQLite local (Modo 100% Offline).
 * Implementa las operaciones de persistencia y trazabilidad de acuerdo con las Secciones 1, 6 y 8.
 */

import type { DatabaseClient, ProductoRow } from '../db/types.ts';
import { centavosAPrecio, precioACentavos } from '../db/types.ts';
import { movimientoRepository } from '../repositories/movimientoRepository.ts';
import { productoRepository } from '../repositories/productoRepository.ts';
import type {
  CrearProductoInput,
  MovimientoStock,
  Producto,
  ResultadoAjuste,
  ResultadoCreacionProducto,
  TipoMovimiento,
} from '../types/inventario.ts';
import {
  mapearMovimientoRowAMovimiento,
  mapearProductoRowAProducto,
  resolveDatabase,
  setDatabaseClient,
} from './inventarioMappers.ts';

export { setDatabaseClient };

export async function getProductosSQLite(db?: DatabaseClient): Promise<Producto[]> {
  const client = await resolveDatabase(db);
  const rows = await productoRepository.obtenerTodos(client);
  return rows.map(mapearProductoRowAProducto);
}

export async function buscarProductosSQLite(
  termino: string,
  db?: DatabaseClient
): Promise<Producto[]> {
  const client = await resolveDatabase(db);
  const limpio = termino.trim();
  if (!limpio) return getProductosSQLite(client);
  const rows = await productoRepository.buscar(client, limpio);
  return rows.map(mapearProductoRowAProducto);
}

export async function getProductoByIdSQLite(
  id: string | number,
  db?: DatabaseClient
): Promise<Producto | null> {
  const client = await resolveDatabase(db);
  const numericId = typeof id === 'number' ? id : parseInt(id, 10);

  if (!isNaN(numericId) && String(numericId) === String(id).trim()) {
    const row = await productoRepository.obtenerPorId(client, numericId);
    if (row) return mapearProductoRowAProducto(row);
  }

  const porRemote = await client.getFirstAsync<ProductoRow>(
    'SELECT * FROM producto WHERE remote_id = ? AND deleted = 0;',
    [String(id)]
  );
  if (porRemote) return mapearProductoRowAProducto(porRemote);

  const porCodigo = await productoRepository.obtenerPorCodigo(client, String(id));
  return porCodigo ? mapearProductoRowAProducto(porCodigo) : null;
}

export async function getProductoByCodigoSQLite(
  codigo: string,
  db?: DatabaseClient
): Promise<Producto | null> {
  const client = await resolveDatabase(db);
  const limpio = codigo.trim();
  if (!limpio) return null;

  const row = await productoRepository.obtenerPorCodigo(client, limpio);
  if (row) return mapearProductoRowAProducto(row);

  return getProductoByIdSQLite(limpio, client);
}

export async function ajustarStockSQLite(
  productoId: string | number,
  tipo: TipoMovimiento,
  cantidad: number,
  motivo: string,
  db?: DatabaseClient
): Promise<ResultadoAjuste> {
  const client = await resolveDatabase(db);
  if (cantidad <= 0) return { exito: false, mensaje: 'La cantidad debe ser mayor a 0' };

  const numericId = typeof productoId === 'number' ? productoId : parseInt(productoId, 10);
  let prodRow: ProductoRow | null = null;

  if (!isNaN(numericId) && String(numericId) === String(productoId).trim()) {
    prodRow = await productoRepository.obtenerPorId(client, numericId);
  }
  if (!prodRow) {
    prodRow = await client.getFirstAsync<ProductoRow>(
      'SELECT * FROM producto WHERE (remote_id = ? OR codigo = ?) AND deleted = 0;',
      [String(productoId), String(productoId)]
    );
  }
  if (!prodRow) return { exito: false, mensaje: 'Producto no encontrado' };

  const stockActual = prodRow.stock;
  const nuevoStock =
    tipo === 'ENTRADA' ? stockActual + cantidad : tipo === 'SALIDA' ? stockActual - cantidad : cantidad;

  // Validación de regla de negocio: Stock nunca negativo
  if (nuevoStock < 0) {
    return {
      exito: false,
      mensaje: `Operación rechazada: stock insuficiente. El stock actual es ${stockActual} y no puede quedar negativo.`,
    };
  }

  const delta = tipo === 'ENTRADA' ? cantidad : tipo === 'SALIDA' ? -cantidad : nuevoStock - stockActual;
  const fecha = new Date().toISOString();
  const remoteMeta = JSON.stringify({ anterior: stockActual, nuevo: nuevoStock });
  const motivoLimpio = motivo.trim() || (tipo === 'ENTRADA' ? 'Entrada manual' : 'Salida manual');

  await productoRepository.actualizarStock(client, prodRow.id, nuevoStock, fecha);
  const movRes = await movimientoRepository.registrar(client, {
    producto_id: prodRow.id,
    delta,
    motivo: motivoLimpio,
    fecha,
    remote_id: remoteMeta,
    updated_at: fecha,
  });

  const productoActualizado: Producto = {
    ...mapearProductoRowAProducto(prodRow),
    stockActual: nuevoStock,
    actualizadoEn: fecha,
  };

  const nuevoMovimiento: MovimientoStock = {
    id: String(movRes.lastInsertRowId),
    productoId: String(prodRow.id),
    productoNombre: prodRow.nombre,
    tipo,
    cantidad,
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
    motivo: motivoLimpio,
    fecha,
  };

  return {
    exito: true,
    mensaje: `Stock actualizado a ${nuevoStock} unidades.`,
    producto: productoActualizado,
    movimiento: nuevoMovimiento,
  };
}

export async function crearProductoSQLite(
  input: CrearProductoInput,
  db?: DatabaseClient
): Promise<ResultadoCreacionProducto> {
  const client = await resolveDatabase(db);
  const codigoLimpio = input.codigoBarras?.trim() ?? '';
  const nombreLimpio = input.nombre?.trim() ?? '';
  const errores: NonNullable<ResultadoCreacionProducto['errores']> = {};

  if (!nombreLimpio) errores.nombre = 'El nombre del producto es obligatorio.';
  if (!codigoLimpio) {
    errores.codigoBarras = 'El código de barras es obligatorio.';
  } else {
    const existente = await productoRepository.obtenerPorCodigo(client, codigoLimpio);
    if (existente) errores.codigoBarras = `El código "${codigoLimpio}" ya existe en el inventario.`;
  }

  if (typeof input.precio !== 'number' || isNaN(input.precio) || input.precio < 0) {
    errores.precio = 'El precio debe ser un número mayor o igual a 0.';
  }
  const stockActual = input.stockActual ?? 0;
  if (typeof stockActual !== 'number' || isNaN(stockActual) || stockActual < 0) {
    errores.stockActual = 'El stock inicial debe ser mayor o igual a 0.';
  }
  const stockMinimo = input.stockMinimo ?? 3;
  if (typeof stockMinimo !== 'number' || isNaN(stockMinimo) || stockMinimo < 1) {
    errores.stockMinimo = 'El stock mínimo debe ser al menos 1.';
  }

  if (Object.keys(errores).length > 0) {
    const primerError = Object.values(errores)[0] ?? 'Datos del producto inválidos.';
    return { exito: false, mensaje: primerError, errores };
  }

  const fecha = new Date().toISOString();
  const res = await productoRepository.crear(client, {
    codigo: codigoLimpio,
    nombre: nombreLimpio,
    precio_centavos: precioACentavos(input.precio),
    stock: stockActual,
    minimo: stockMinimo,
    updated_at: fecha,
  });

  const nuevoId = res.lastInsertRowId;
  const nuevoProducto: Producto = {
    id: String(nuevoId),
    codigoBarras: codigoLimpio,
    nombre: nombreLimpio,
    categoria: input.categoria?.trim() || 'General',
    precio: input.precio,
    stockActual,
    stockMinimo,
    unidadMedida: input.unidadMedida?.trim() || 'unidad',
    actualizadoEn: fecha,
  };

  if (stockActual > 0) {
    const remoteMeta = JSON.stringify({ anterior: 0, nuevo: stockActual });
    await movimientoRepository.registrar(client, {
      producto_id: nuevoId,
      delta: stockActual,
      motivo: 'Inventario inicial al registrar producto',
      fecha,
      remote_id: remoteMeta,
      updated_at: fecha,
    });
  }

  return {
    exito: true,
    mensaje: `Producto "${nuevoProducto.nombre}" registrado exitosamente.`,
    producto: nuevoProducto,
  };
}

export async function getMovimientosSQLite(
  limite: number = 50,
  db?: DatabaseClient
): Promise<MovimientoStock[]> {
  const client = await resolveDatabase(db);
  const rows = await movimientoRepository.obtenerTodos(client, limite);
  return rows.map((r) => mapearMovimientoRowAMovimiento(r));
}

export async function getMovimientosPorProductoSQLite(
  productoId: string | number,
  db?: DatabaseClient
): Promise<MovimientoStock[]> {
  const client = await resolveDatabase(db);
  const numericId = typeof productoId === 'number' ? productoId : parseInt(productoId, 10);
  if (isNaN(numericId)) return [];

  const prod = await productoRepository.obtenerPorId(client, numericId);
  const rows = await movimientoRepository.obtenerPorProducto(client, numericId);
  return rows.map((r) => mapearMovimientoRowAMovimiento(r, prod?.nombre));
}

export async function valorInventarioSQLite(db?: DatabaseClient): Promise<number> {
  const client = await resolveDatabase(db);
  const productos = await productoRepository.obtenerTodos(client);
  return productos.reduce((total, p) => total + centavosAPrecio(p.precio_centavos) * p.stock, 0);
}
