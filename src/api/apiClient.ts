/**
 * Cliente HTTP seguro para la API REST del inventario.
 * Gestiona autenticación con Bearer token, auto-renovación con refresh token (Sección 9.1)
 * y normalización de errores tipados.
 * REGLA DE ORO: La app no contiene credenciales de Firebase; se comunica exclusivamente
 * a través de la URL de API configurada.
 */

import { authStorage } from './authStorage.ts';

export interface ApiErrorDetalle {
  campo?: string;
  mensaje: string;
  codigo?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error: string;
  detalles?: ApiErrorDetalle[] | string[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly detalles?: ApiErrorDetalle[] | string[];

  constructor(
    mensaje: string,
    status: number = 500,
    detalles?: ApiErrorDetalle[] | string[]
  ) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.detalles = detalles;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

export const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_API_URL;
}

// Promesa compartida para deduplicar llamadas concurrentes a refresh token
let refreshInFlight: Promise<string> | null = null;

async function extraerRespuestaError(response: Response): Promise<ApiErrorResponse> {
  try {
    const rawText = await response.text();
    if (!rawText) {
      return { error: `Error HTTP ${response.status}` };
    }
    try {
      const parsed = JSON.parse(rawText) as {
        error?: string;
        message?: string;
        detalles?: ApiErrorDetalle[] | string[];
      };
      if (typeof parsed.error === 'string') {
        return { error: parsed.error, detalles: parsed.detalles };
      }
      if (typeof parsed.message === 'string') {
        return { error: parsed.message, detalles: parsed.detalles };
      }
      return { error: rawText };
    } catch {
      return { error: rawText };
    }
  } catch {
    return { error: `Error HTTP ${response.status}` };
  }
}

/**
 * Ejecuta la renovación de token llamando una sola vez a /api/auth/refresh.
 * Si falla, limpia la sesión y propaga ApiError.
 */
async function renovarSesion(refreshToken: string): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/refresh`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (netErr) {
    await authStorage.eliminarTokens();
    throw new ApiError(
      netErr instanceof Error ? netErr.message : 'Error de conexión al renovar sesión',
      0
    );
  }

  if (!response.ok) {
    const errData = await extraerRespuestaError(response);
    await authStorage.eliminarTokens();
    throw new ApiError(errData.error || 'Sesión expirada', response.status, errData.detalles);
  }

  const data = (await response.json()) as {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  const nuevoToken = data.token ?? data.accessToken;
  if (!nuevoToken) {
    await authStorage.eliminarTokens();
    throw new ApiError('Respuesta de renovación inválida: falta token', 401);
  }

  const nuevoRefreshToken = data.refreshToken ?? refreshToken;
  await authStorage.guardarTokens({
    token: nuevoToken,
    refreshToken: nuevoRefreshToken,
  });

  return nuevoToken;
}

/**
 * Realiza peticiones tipadas a la API REST.
 * Maneja adjuntos de Authorization Bearer, auto-renovación ante 401 y tipado de errores.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const ruta = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Adjuntar token Bearer si existe y no se omitió auth
  if (!options.skipAuth && !headers.has('Authorization')) {
    const tokens = await authStorage.obtenerTokens();
    if (tokens?.token) {
      headers.set('Authorization', `Bearer ${tokens.token}`);
    }
  }

  // Formatear body si se proporcionó un objeto
  let body: BodyInit | undefined = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'string') {
      body = options.body;
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    body,
  };

  let response: Response;
  try {
    response = await fetch(ruta, fetchOptions);
  } catch (netErr) {
    throw new ApiError(
      netErr instanceof Error ? netErr.message : 'Error de conexión con el servidor',
      0
    );
  }

  // Regla estricta Sección 9.1:
  // Si devuelve 401, llama UNA SOLA VEZ a /api/auth/refresh con refreshToken.
  const esEndpointRefresh = endpoint.includes('/auth/refresh');
  if (response.status === 401 && !options._isRetry && !esEndpointRefresh) {
    const tokens = await authStorage.obtenerTokens();
    if (!tokens?.refreshToken) {
      await authStorage.eliminarTokens();
      const err = await extraerRespuestaError(response);
      throw new ApiError(err.error || 'No autorizado', 401, err.detalles);
    }

    try {
      if (!refreshInFlight) {
        refreshInFlight = renovarSesion(tokens.refreshToken).finally(() => {
          refreshInFlight = null;
        });
      }
      const nuevoToken = await refreshInFlight;

      // Reintentar petición original con el nuevo token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${nuevoToken}`);

      return await apiFetch<T>(endpoint, {
        ...options,
        headers: retryHeaders,
        _isRetry: true,
      });
    } catch (refreshErr) {
      await authStorage.eliminarTokens();
      if (refreshErr instanceof ApiError) {
        throw refreshErr;
      }
      throw new ApiError(
        refreshErr instanceof Error ? refreshErr.message : 'Error al renovar sesión',
        401
      );
    }
  }

  if (!response.ok) {
    const errorPayload = await extraerRespuestaError(response);
    throw new ApiError(errorPayload.error, response.status, errorPayload.detalles);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const apiClient = {
  apiFetch,
  getApiBaseUrl,
};
