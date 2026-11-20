import type {
  CrearProductoInput,
  MovimientoStock,
  Producto,
  ResultadoAjuste,
  ResultadoCreacionProducto,
  TipoMovimiento,
} from '@/types/inventario';
import { MOVIMIENTOS_INICIALES, PRODUCTOS_INICIALES } from './mockInventario.ts';

export {
  getProductosSQLite as getProductosAsync,
  buscarProductosSQLite as buscarProductosAsync,
  getProductoByIdSQLite as getProductoByIdAsync,
  getProductoByCodigoSQLite as getProductoByCodigoAsync,
  ajustarStockSQLite as ajustarStockAsync,
  crearProductoSQLite as crearProductoAsync,
  getMovimientosSQLite as getMovimientosAsync,
  getMovimientosPorProductoSQLite as getMovimientosPorProductoAsync,
  valorInventarioSQLite as valorInventarioAsync,
  deshacerUltimoMovimientoSQLite as deshacerUltimoMovimientoAsync,
  setDatabaseClient,
} from './inventarioSQLite.ts';

// Estado en memoria para sincronización y compatibilidad con pruebas unitarias
let productosMemoria: Producto[] = PRODUCTOS_INICIALES.map((p) => ({ ...p }));
let movimientosMemoria: MovimientoStock[] = MOVIMIENTOS_INICIALES.map((m) => ({ ...m }));

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

export function deshacerUltimoMovimiento(productoId?: string): ResultadoAjuste {
  const mov = productoId
    ? movimientosMemoria.find((m) => m.productoId === productoId)
    : movimientosMemoria[0];

  if (!mov) {
    return { exito: false, mensaje: 'No hay movimientos para deshacer' };
  }

  const indice = productosMemoria.findIndex((p) => p.id === mov.productoId);
  if (indice === -1) {
    return { exito: false, mensaje: 'Producto asociado al movimiento no encontrado' };
  }

  const producto = productosMemoria[indice]!;
  let nuevoStock = producto.stockActual;
  let tipoReversion: TipoMovimiento = 'SALIDA';

  if (mov.tipo === 'ENTRADA') {
    if (producto.stockActual - mov.cantidad < 0) {
      return {
        exito: false,
        mensaje: `No se puede deshacer: el stock resultante sería negativo. El stock actual es ${producto.stockActual}.`,
      };
    }
    nuevoStock = producto.stockActual - mov.cantidad;
    tipoReversion = 'SALIDA';
  } else if (mov.tipo === 'SALIDA') {
    nuevoStock = producto.stockActual + mov.cantidad;
    tipoReversion = 'ENTRADA';
  } else {
    return { exito: false, mensaje: 'El último movimiento no modificó la cantidad de stock.' };
  }

  const fecha = new Date().toISOString();
  const motivoReversion = `Deshacer: reversión de ${mov.tipo.toLowerCase()} (${mov.cantidad} unidades)`;

  const productoActualizado: Producto = {
    ...producto,
    stockActual: nuevoStock,
    actualizadoEn: fecha,
  };

  const nuevoMovimiento: MovimientoStock = {
    id: `mov-${Date.now()}`,
    productoId: producto.id,
    productoNombre: producto.nombre,
    tipo: tipoReversion,
    cantidad: mov.cantidad,
    stockAnterior: producto.stockActual,
    stockNuevo: nuevoStock,
    motivo: motivoReversion,
    fecha,
  };

  productosMemoria[indice] = productoActualizado;
  movimientosMemoria.unshift(nuevoMovimiento);

  return {
    exito: true,
    mensaje: `Se deshizo el último movimiento (${mov.cantidad} unidades de ${producto.nombre}).`,
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

/**
 * Calcula el valor monetario total del inventario (suma de precio * stockActual).
 * Si no se proporciona la lista de productos, utiliza el catálogo en memoria.
 */
export function valorInventario(productos?: Producto[]): number {
  const catalogo = productos ?? productosMemoria;
  return catalogo.reduce((total, p) => total + p.precio * p.stockActual, 0);
}

/**
 * Función pura que determina si un producto se encuentra en alerta de bajo stock.
 * Se activa cuando el stockActual es menor o igual al stockMinimo.
 */
export function esBajoStock(producto: { stockActual: number; stockMinimo: number }): boolean {
  return producto.stockActual <= producto.stockMinimo;
}

/**
 * Restablece el inventario y movimientos en memoria a su estado inicial o personalizado.
 * Diseñada para pruebas unitarias e inicialización limpia de datos.
 */
export function reiniciarMemoria(
  productos: Producto[] = PRODUCTOS_INICIALES,
  movimientos: MovimientoStock[] = MOVIMIENTOS_INICIALES
): void {
  productosMemoria = productos.map((p) => ({ ...p }));
  movimientosMemoria = movimientos.map((m) => ({ ...m }));
}
