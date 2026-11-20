import { MovimientoStock, Producto, ResultadoAjuste, TipoMovimiento } from '@/types/inventario';

// Productos iniciales para la tienda de barrio
const PRODUCTOS_INICIALES: Producto[] = [
  {
    id: 'prod-1',
    codigoBarras: '7701234567890',
    nombre: 'Leche Entera 1L',
    categoria: 'Lácteos',
    precio: 3800,
    stockActual: 12,
    stockMinimo: 5,
    unidadMedida: 'bolsa',
    actualizadoEn: '2026-11-20T08:00:00Z',
  },
  {
    id: 'prod-2',
    codigoBarras: '7702345678901',
    nombre: 'Arroz Blanco 1kg',
    categoria: 'Granos',
    precio: 4500,
    stockActual: 2,
    stockMinimo: 4,
    unidadMedida: 'paquete',
    actualizadoEn: '2026-11-20T08:15:00Z',
  },
  {
    id: 'prod-3',
    codigoBarras: '7703456789012',
    nombre: 'Aceite Vegetal 500ml',
    categoria: 'Abarrotes',
    precio: 6200,
    stockActual: 8,
    stockMinimo: 3,
    unidadMedida: 'botella',
    actualizadoEn: '2026-11-20T08:30:00Z',
  },
  {
    id: 'prod-4',
    codigoBarras: '7704567890123',
    nombre: 'Pan Tajado Tradicional',
    categoria: 'Panadería',
    precio: 5000,
    stockActual: 1,
    stockMinimo: 3,
    unidadMedida: 'bolsa',
    actualizadoEn: '2026-11-20T08:45:00Z',
  },
  {
    id: 'prod-5',
    codigoBarras: '7705678901234',
    nombre: 'Huevos AA x12',
    categoria: 'Abarrotes',
    precio: 9500,
    stockActual: 15,
    stockMinimo: 6,
    unidadMedida: 'cubeta',
    actualizadoEn: '2026-11-20T09:00:00Z',
  },
  {
    id: 'prod-6',
    codigoBarras: '7706789012345',
    nombre: 'Café Molido 250g',
    categoria: 'Bebidas',
    precio: 7800,
    stockActual: 6,
    stockMinimo: 2,
    unidadMedida: 'paquete',
    actualizadoEn: '2026-11-20T09:15:00Z',
  },
];

const MOVIMIENTOS_INICIALES: MovimientoStock[] = [
  {
    id: 'mov-1',
    productoId: 'prod-1',
    productoNombre: 'Leche Entera 1L',
    tipo: 'ENTRADA',
    cantidad: 10,
    stockAnterior: 2,
    stockNuevo: 12,
    motivo: 'Recepción pedido proveedor',
    fecha: '2026-11-20T08:00:00Z',
  },
  {
    id: 'mov-2',
    productoId: 'prod-4',
    productoNombre: 'Pan Tajado Tradicional',
    tipo: 'SALIDA',
    cantidad: 2,
    stockAnterior: 3,
    stockNuevo: 1,
    motivo: 'Venta mostrador',
    fecha: '2026-11-20T08:45:00Z',
  },
  {
    id: 'mov-3',
    productoId: 'prod-5',
    productoNombre: 'Huevos AA x12',
    tipo: 'ENTRADA',
    cantidad: 15,
    stockAnterior: 0,
    stockNuevo: 15,
    motivo: 'Compra matutina',
    fecha: '2026-11-20T09:00:00Z',
  },
  {
    id: 'mov-4',
    productoId: 'prod-2',
    productoNombre: 'Arroz Blanco 1kg',
    tipo: 'SALIDA',
    cantidad: 3,
    stockAnterior: 5,
    stockNuevo: 2,
    motivo: 'Venta cliente frecuente',
    fecha: '2026-11-20T09:10:00Z',
  },
];

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
