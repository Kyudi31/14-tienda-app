export interface Producto {
  id: string;
  codigoBarras: string;
  nombre: string;
  categoria: string;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  actualizadoEn: string;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface MovimientoStock {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  fecha: string;
}

export interface ResultadoAjuste {
  exito: boolean;
  mensaje: string;
  producto?: Producto;
  movimiento?: MovimientoStock;
}
