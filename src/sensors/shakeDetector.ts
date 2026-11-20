/**
 * Lógica pura de calibración y detección de sacudida (Shake Detection).
 * Separa la matemática y reglas de calibración del hardware según las Secciones 5 y 11.
 */

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

/** Umbral calibrado de aceleración en G-forces para detectar un gesto intencional de sacudida */
export const DEFAULT_SHAKE_THRESHOLD = 1.8;

/** Período de enfriamiento (cooldown) en milisegundos para evitar disparos dobles */
export const DEFAULT_SHAKE_COOLDOWN_MS = 1000;

/**
 * Calcula la magnitud euclidiana del vector de aceleración (|a| = √(x² + y² + z²)).
 * En reposo plano, la gravedad produce una magnitud cercana a 1.0G.
 */
export function calcularMagnitudAceleracion(data: AccelerometerData): number {
  return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
}

/**
 * Alias de conveniencia para cálculo de magnitud.
 */
export const calcularMagnitud = calcularMagnitudAceleracion;

/**
 * Función pura que evalúa si una lectura del acelerómetro constituye una sacudida válida.
 * 1. Comprueba que el tiempo transcurrido desde el último disparo sea >= cooldownMs.
 * 2. Comprueba que la magnitud de aceleración sea >= threshold.
 */
export function esSacudida(
  data: AccelerometerData,
  ultimoDisparoMs: number,
  ahoraMs: number,
  threshold: number = DEFAULT_SHAKE_THRESHOLD,
  cooldownMs: number = DEFAULT_SHAKE_COOLDOWN_MS
): boolean {
  if (ahoraMs - ultimoDisparoMs < cooldownMs) {
    return false;
  }
  const magnitud = calcularMagnitudAceleracion(data);
  return magnitud >= threshold;
}

/**
 * Alias de compatibilidad semántica.
 */
export const detectarSacudida = esSacudida;
