import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajustarStock,
  crearProducto,
  esBajoStock,
  getProductoById,
  reiniciarMemoria,
  valorInventario,
} from '../inventario.ts';
import type { Producto } from '@/types/inventario';

describe('Suite de Pruebas Unitarias - Servicio de Inventario (Sección 11)', () => {
  beforeEach(() => {
    reiniciarMemoria();
  });

  // Prueba 1: Criterio 1
  it('Prueba 1: Criterio 1 - Dado un producto con stock 2, al intentar sacar 3, la operación es rechazada y el stock se mantiene en 2', () => {
    // prod-2 (Arroz Blanco 1kg) tiene stockActual = 2 en PRODUCTOS_INICIALES
    const productoInicial = getProductoById('prod-2');
    assert.ok(productoInicial, 'El producto prod-2 debe existir en el catálogo inicial');
    if (!productoInicial) return;
    assert.strictEqual(productoInicial.stockActual, 2, 'El stock inicial debe ser 2');

    const resultado = ajustarStock('prod-2', 'SALIDA', 3, 'Intento de venta mayor al stock');

    assert.strictEqual(resultado.exito, false, 'La operación debe ser rechazada (exito: false)');
    assert.match(resultado.mensaje, /insuficiente|rechazada|no puede quedar negativo/i);

    const productoDespues = getProductoById('prod-2');
    assert.ok(productoDespues, 'El producto prod-2 debe seguir existiendo');
    if (!productoDespues) return;
    assert.strictEqual(productoDespues.stockActual, 2, 'El stock actual debe mantenerse intacto en 2');
  });

  // Prueba 2: Utilidad valorInventario
  it('Prueba 2: Utilidad valorInventario() calcula correctamente el valor total del inventario (precio * stock)', () => {
    const productosPrueba: Producto[] = [
      {
        id: 'test-1',
        codigoBarras: '111',
        nombre: 'Producto A',
        categoria: 'Cat A',
        precio: 1000,
        stockActual: 5,
        stockMinimo: 2,
        unidadMedida: 'unidad',
        actualizadoEn: new Date().toISOString(),
      },
      {
        id: 'test-2',
        codigoBarras: '222',
        nombre: 'Producto B',
        categoria: 'Cat B',
        precio: 2500,
        stockActual: 4,
        stockMinimo: 1,
        unidadMedida: 'unidad',
        actualizadoEn: new Date().toISOString(),
      },
      {
        id: 'test-3',
        codigoBarras: '333',
        nombre: 'Producto C',
        categoria: 'Cat C',
        precio: 500,
        stockActual: 0,
        stockMinimo: 3,
        unidadMedida: 'unidad',
        actualizadoEn: new Date().toISOString(),
      },
    ];

    // (1000 * 5) + (2500 * 4) + (500 * 0) = 5000 + 10000 + 0 = 15000
    const totalCalculado = valorInventario(productosPrueba);
    assert.strictEqual(totalCalculado, 15000, 'El valor del inventario debe ser 15000');

    // Con arreglo vacío debe retornar 0
    assert.strictEqual(valorInventario([]), 0, 'El valor del inventario vacío debe ser 0');

    // Sin argumentos calcula sobre el estado en memoria
    reiniciarMemoria(productosPrueba, []);
    assert.strictEqual(valorInventario(), 15000, 'Debe calcular correctamente sobre el estado en memoria');
  });

  // Prueba 3: Regla de bajo stock
  it('Prueba 3: Regla de bajo stock - la alerta se activa cuando stock <= minimo y se desactiva cuando stock > minimo', () => {
    // Alerta activada cuando stockActual < stockMinimo
    assert.strictEqual(
      esBajoStock({ stockActual: 1, stockMinimo: 3 }),
      true,
      'Debe ser bajo stock si stockActual < stockMinimo'
    );

    // Alerta activada en el límite crítico (stockActual === stockMinimo)
    assert.strictEqual(
      esBajoStock({ stockActual: 3, stockMinimo: 3 }),
      true,
      'Debe ser bajo stock en el límite (stockActual === stockMinimo)'
    );

    // Alerta desactivada cuando stockActual > stockMinimo
    assert.strictEqual(
      esBajoStock({ stockActual: 4, stockMinimo: 3 }),
      false,
      'No debe ser bajo stock cuando stockActual > stockMinimo'
    );

    // Alerta activada con stock en cero
    assert.strictEqual(
      esBajoStock({ stockActual: 0, stockMinimo: 5 }),
      true,
      'Debe ser bajo stock cuando stockActual es 0 y stockMinimo > 0'
    );
  });

  // Prueba 4: Validación de alta de producto
  it('Prueba 4: Validación de alta de producto - no permite crear producto con código duplicado ni con precio negativo', () => {
    // Intento con código duplicado (el código '7701234567890' ya existe en prod-1)
    const resultadoDuplicado = crearProducto({
      codigoBarras: '7701234567890',
      nombre: 'Leche Clonada',
      precio: 4200,
      stockActual: 10,
      stockMinimo: 5,
    });

    assert.strictEqual(resultadoDuplicado.exito, false, 'No debe permitir código de barras duplicado');
    assert.ok(resultadoDuplicado.errores?.codigoBarras, 'Debe reportar error en el campo codigoBarras');
    assert.match(
      resultadoDuplicado.errores?.codigoBarras ?? '',
      /ya existe/i,
      'El mensaje debe indicar duplicidad'
    );

    // Intento con precio negativo
    const resultadoPrecioNegativo = crearProducto({
      codigoBarras: '9998887776665',
      nombre: 'Producto Precio Negativo',
      precio: -1500,
      stockActual: 5,
      stockMinimo: 2,
    });

    assert.strictEqual(resultadoPrecioNegativo.exito, false, 'No debe permitir precio negativo');
    assert.ok(resultadoPrecioNegativo.errores?.precio, 'Debe reportar error en el campo precio');
    assert.match(
      resultadoPrecioNegativo.errores?.precio ?? '',
      /mayor o igual a 0/i,
      'El mensaje debe indicar restricción de precio'
    );
  });

  // Prueba 5: Validación de entrada válida incrementa el stock correctamente
  it('Prueba 5: Validación de entrada válida incrementa el stock correctamente', () => {
    // prod-6 (Café Molido 250g) tiene stockActual = 6 en PRODUCTOS_INICIALES
    const productoAntes = getProductoById('prod-6');
    assert.ok(productoAntes, 'El producto prod-6 debe existir');
    if (!productoAntes) return;
    const stockPrevio = productoAntes.stockActual;
    const incremento = 4;

    const resultado = ajustarStock('prod-6', 'ENTRADA', incremento, 'Reposición proveedor');

    assert.strictEqual(resultado.exito, true, 'La entrada de stock debe ser exitosa');
    assert.ok(resultado.producto, 'El resultado debe incluir el producto actualizado');
    assert.strictEqual(
      resultado.producto?.stockActual,
      stockPrevio + incremento,
      'El stock en el resultado debe ser igual a stockPrevio + incremento'
    );

    // Verificar persistencia en memoria
    const productoDespues = getProductoById('prod-6');
    assert.ok(productoDespues, 'El producto prod-6 debe persistir en memoria');
    if (!productoDespues) return;
    assert.strictEqual(
      productoDespues.stockActual,
      stockPrevio + incremento,
      'El stock consultado en memoria debe haberse incrementado correctamente'
    );

    // Verificar que se haya registrado el movimiento correspondiente
    assert.ok(resultado.movimiento, 'Debe haberse generado un registro de movimiento');
    assert.strictEqual(resultado.movimiento?.tipo, 'ENTRADA');
    assert.strictEqual(resultado.movimiento?.cantidad, incremento);
    assert.strictEqual(resultado.movimiento?.stockAnterior, stockPrevio);
    assert.strictEqual(resultado.movimiento?.stockNuevo, stockPrevio + incremento);
  });
});
