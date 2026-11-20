/**
 * Hook personalizado para detección de sacudida (Shake to Undo) con expo-sensors.
 * Implementa las reglas obligatorias de la Sección 5:
 * (1) Llama siempre a Accelerometer.isAvailableAsync() antes de suscribirse.
 * (2) Cancela la suscripción (subscription.remove()) al desmontar el componente.
 * (3) La app NUNCA se rompe si el acelerómetro no está disponible (ej. web o emulador).
 */

import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

import {
  DEFAULT_SHAKE_COOLDOWN_MS,
  DEFAULT_SHAKE_THRESHOLD,
  esSacudida,
} from './shakeDetector.ts';

export * from './shakeDetector.ts';

type AccelerometerSubscription = ReturnType<typeof Accelerometer.addListener>;

export interface UseShakeOptions {
  /** Umbral de aceleración en Gs para activar el callback (por defecto 1.8) */
  threshold?: number;
  /** Cooldown mínimo entre disparos en milisegundos (por defecto 1000) */
  cooldownMs?: number;
  /** Intervalo de actualización del sensor en ms (por defecto 100) */
  updateIntervalMs?: number;
  /** Si la suscripción está habilitada activamente (por defecto true) */
  enabled?: boolean;
}

export interface UseShakeResult {
  /** Indica si el acelerómetro está disponible físicamente en el dispositivo actual */
  isAvailable: boolean;
}

export function useShake(
  onShake: () => void,
  options: UseShakeOptions = {}
): UseShakeResult {
  const {
    threshold = DEFAULT_SHAKE_THRESHOLD,
    cooldownMs = DEFAULT_SHAKE_COOLDOWN_MS,
    updateIntervalMs = 100,
    enabled = true,
  } = options;

  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const ultimoDisparoRef = useRef<number>(0);
  const onShakeRef = useRef(onShake);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!enabled) return;

    let subscription: AccelerometerSubscription | null = null;
    let cancelado = false;

    async function suscribirSensor() {
      try {
        const disponible = await Accelerometer.isAvailableAsync();
        if (cancelado) return;
        setIsAvailable(disponible);

        if (!disponible) return;

        Accelerometer.setUpdateInterval(updateIntervalMs);

        subscription = Accelerometer.addListener((data) => {
          const ahora = Date.now();
          if (esSacudida(data, ultimoDisparoRef.current, ahora, threshold, cooldownMs)) {
            ultimoDisparoRef.current = ahora;
            onShakeRef.current();
          }
        });
      } catch {
        // En web o entornos sin sensor, no debe romper la app
        if (!cancelado) {
          setIsAvailable(false);
        }
      }
    }

    suscribirSensor();

    return () => {
      cancelado = true;
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    };
  }, [enabled, threshold, cooldownMs, updateIntervalMs]);

  return { isAvailable };
}
