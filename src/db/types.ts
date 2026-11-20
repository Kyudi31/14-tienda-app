/**
 * Tipos estrictos para las filas de SQLite en la base de datos local.
 * Siguen convención snake_case según la Sección 9.2 de la planeación.
 */

export interface ProductoRow {
  id: number;
  codigo: string | null;
  nombre: string;
  precio_centavos: number;
  stock: number;
  minimo: number;
  remote_id: string | null;
  updated_at: string | null;
  deleted: number;
  pending: number;
}

export interface MovimientoStockRow {
  id: number;
  producto_id: number;
  delta: number;
  motivo: string;
  fecha: string;
  remote_id: string | null;
  updated_at: string | null;
  deleted: number;
  pending: number;
}

export type NuevoProductoRow = Omit<ProductoRow, 'id'>;
export type NuevoMovimientoStockRow = Omit<MovimientoStockRow, 'id'>;

/**
 * Convierte un precio decimal o estándar (ej: 3800 COP o 12.50)
 * a su equivalente entero en centavos para SQLite (380000 o 1250).
 */
export function precioACentavos(precio: number): number {
  return Math.round(precio * 100);
}

/**
 * Convierte centavos enteros desde SQLite (ej: 380000 o 1250)
 * a la unidad monetaria decimal estándar (3800 o 12.50).
 */
export function centavosAPrecio(centavos: number): number {
  return centavos / 100;
}
