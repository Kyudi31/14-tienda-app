import {
  CrearProductoInput,
  MovimientoStock,
  Producto,
  ResultadoAjuste,
  ResultadoCreacionProducto,
  TipoMovimiento,
} from '@/types/inventario';
import { MOVIMIENTOS_INICIALES, PRODUCTOS_INICIALES } from './mockInventario';

// Estado en memoria para sincronización entre componentes
let productosMemoria: Producto[] = [...PRODUCTOS_INICIALES];
let movimientosMemoria: MovimientoStock[] = [...MOVIMIENTOS_INICIALES];

export function getProductos(): Producto[] {
  return [...productosMemoria];
}

export function getProductoById(id: string): Producto | undefined {
  return productosMemoria.find((p) => p.id === id);
}

export function getProductoByCodigo(codigo: string): Producto | undefined {
  const limpiado = codigo.trim();
  return productosMemoria.find(
    (p) => p.codigoBarras === limpiado || p.id === limpiado
  );
}

export function getMovimientos(): MovimientoStock[] {
  return [...movimientosMemoria].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

export function getMovimientosPorProducto(productoId: string): MovimientoStock[] {
  return movimientosMemoria
    .filter((m) => m.productoId === productoId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function calcularNuevoStock(
  stockActual: number,
  tipo: TipoMovimiento,
  cantidad: number
): number {
  if (tipo === 'ENTRADA') return stockActual + cantidad;
  if (tipo === 'SALIDA') return stockActual - cantidad;
  return cantidad;
}

export function ajustarStock(
  productoId: string,
  tipo: TipoMovimiento,
  cantidad: number,
  motivo: string
): ResultadoAjuste {
  const indice = productosMemoria.findIndex((p) => p.id === productoId);
  if (indice === -1) {
    return { exito: false, mensaje: 'Producto no encontrado' };
  }

  if (cantidad <= 0) {
    return { exito: false, mensaje: 'La cantidad debe ser mayor a 0' };
  }

  const producto = productosMemoria[indice]!;
  const nuevoStock = calcularNuevoStock(producto.stockActual, tipo, cantidad);

  // Validación de regla de negocio: Stock nunca negativo
  if (nuevoStock < 0) {
    return {
      exito: false,
      mensaje: `Operación rechazada: stock insuficiente. El stock actual es ${producto.stockActual} y no puede quedar negativo.`,
    };
  }

  const productoActualizado: Producto = {
    ...producto,
    stockActual: nuevoStock,
    actualizadoEn: new Date().toISOString(),
  };

  const nuevoMovimiento: MovimientoStock = {
    id: `mov-${Date.now()}`,
    productoId: producto.id,
    productoNombre: producto.nombre,
    tipo,
    cantidad,
    stockAnterior: producto.stockActual,
    stockNuevo: nuevoStock,
    motivo: motivo.trim() || (tipo === 'ENTRADA' ? 'Entrada manual' : 'Salida manual'),
    fecha: new Date().toISOString(),
  };

  productosMemoria[indice] = productoActualizado;
  movimientosMemoria.unshift(nuevoMovimiento);

  return {
    exito: true,
    mensaje: `Stock actualizado a ${nuevoStock} unidades.`,
    producto: productoActualizado,
    movimiento: nuevoMovimiento,
  };
}

export function buscarProductos(termino: string): Producto[] {
  const limpio = termino.trim().toLowerCase();
  if (!limpio) return [...productosMemoria];
  return productosMemoria.filter(
    (p) =>
      p.nombre.toLowerCase().includes(limpio) ||
      p.codigoBarras.toLowerCase().includes(limpio) ||
      p.categoria.toLowerCase().includes(limpio)
  );
}

export function crearProducto(input: CrearProductoInput): ResultadoCreacionProducto {
  const codigoLimpio = input.codigoBarras?.trim() ?? '';
  const nombreLimpio = input.nombre?.trim() ?? '';
  const errores: NonNullable<ResultadoCreacionProducto['errores']> = {};

  if (!nombreLimpio) {
    errores.nombre = 'El nombre del producto es obligatorio.';
  }

  if (!codigoLimpio) {
    errores.codigoBarras = 'El código de barras es obligatorio.';
  } else if (getProductoByCodigo(codigoLimpio)) {
    errores.codigoBarras = `El código "${codigoLimpio}" ya existe en el inventario.`;
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

  const nuevoId = `prod-${Date.now()}`;
  const nuevoProducto: Producto = {
    id: nuevoId,
    codigoBarras: codigoLimpio,
    nombre: nombreLimpio,
    categoria: input.categoria?.trim() || 'General',
    precio: input.precio,
    stockActual,
    stockMinimo,
    unidadMedida: input.unidadMedida?.trim() || 'unidad',
    actualizadoEn: new Date().toISOString(),
  };

  productosMemoria.unshift(nuevoProducto);

  if (stockActual > 0) {
    const nuevoMovimiento: MovimientoStock = {
      id: `mov-${Date.now()}`,
      productoId: nuevoProducto.id,
      productoNombre: nuevoProducto.nombre,
      tipo: 'ENTRADA',
      cantidad: stockActual,
      stockAnterior: 0,
      stockNuevo: stockActual,
      motivo: 'Inventario inicial al registrar producto',
      fecha: new Date().toISOString(),
    };
    movimientosMemoria.unshift(nuevoMovimiento);
  }

  return {
    exito: true,
    mensaje: `Producto "${nuevoProducto.nombre}" registrado exitosamente.`,
    producto: nuevoProducto,
  };
}

