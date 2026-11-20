/**
 * Almacenamiento seguro de tokens y sesión de usuario.
 * Utiliza expo-secure-store en dispositivos móviles nativos
 * y provee un almacenamiento seguro en memoria como fallback para web y pruebas unitarias.
 * Cumple con los requerimientos de la Sección 9.1 de la planeación.
 */

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface AuthUsuario {
  id: string;
  email?: string;
  nombre?: string;
  rol?: string;
  [key: string]: unknown;
}

const KEY_TOKEN = 'auth_token';
const KEY_REFRESH_TOKEN = 'auth_refresh_token';
const KEY_USUARIO = 'auth_usuario';

// Fallback en memoria seguro para entornos sin SecureStore (tests/web)
const memoriaStore = new Map<string, string>();

type SecureStoreModule = typeof import('expo-secure-store');

let cachedDriver: SecureStoreModule | null = null;
let isNativeChecked = false;
let isNativeSupported = false;

async function getDriver(): Promise<SecureStoreModule | null> {
  if (isNativeChecked) {
    return isNativeSupported ? cachedDriver : null;
  }
  isNativeChecked = true;
  try {
    const store = await import('expo-secure-store');
    if (typeof store.isAvailableAsync === 'function') {
      const available = await store.isAvailableAsync().catch(() => false);
      if (available) {
        cachedDriver = store;
        isNativeSupported = true;
        return store;
      }
    }
  } catch {
    // Entorno sin soporte nativo de SecureStore (tests, web)
  }
  isNativeSupported = false;
  return null;
}

/**
 * Guarda el par de tokens (acceso y refresco) de forma segura.
 */
export async function guardarTokens(tokens: AuthTokens): Promise<void> {
  const driver = await getDriver();
  if (driver) {
    await driver.setItemAsync(KEY_TOKEN, tokens.token);
    await driver.setItemAsync(KEY_REFRESH_TOKEN, tokens.refreshToken);
  }
  memoriaStore.set(KEY_TOKEN, tokens.token);
  memoriaStore.set(KEY_REFRESH_TOKEN, tokens.refreshToken);
}

/**
 * Obtiene los tokens de autenticación almacenados.
 * Retorna null si alguno de los dos tokens no se encuentra presente.
 */
export async function obtenerTokens(): Promise<AuthTokens | null> {
  const driver = await getDriver();
  let token: string | null = null;
  let refreshToken: string | null = null;

  if (driver) {
    token = await driver.getItemAsync(KEY_TOKEN);
    refreshToken = await driver.getItemAsync(KEY_REFRESH_TOKEN);
  } else {
    token = memoriaStore.get(KEY_TOKEN) ?? null;
    refreshToken = memoriaStore.get(KEY_REFRESH_TOKEN) ?? null;
  }

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken };
}

/**
 * Elimina los tokens de autenticación.
 */
export async function eliminarTokens(): Promise<void> {
  const driver = await getDriver();
  if (driver) {
    await driver.deleteItemAsync(KEY_TOKEN).catch(() => {});
    await driver.deleteItemAsync(KEY_REFRESH_TOKEN).catch(() => {});
  }
  memoriaStore.delete(KEY_TOKEN);
  memoriaStore.delete(KEY_REFRESH_TOKEN);
}

/**
 * Guarda los datos del usuario autenticado en almacenamiento seguro.
 */
export async function guardarUsuario(usuario: AuthUsuario): Promise<void> {
  const serializado = JSON.stringify(usuario);
  const driver = await getDriver();
  if (driver) {
    await driver.setItemAsync(KEY_USUARIO, serializado);
  }
  memoriaStore.set(KEY_USUARIO, serializado);
}

/**
 * Obtiene los datos del usuario previamente guardados.
 */
export async function obtenerUsuario(): Promise<AuthUsuario | null> {
  const driver = await getDriver();
  let serializado: string | null = null;

  if (driver) {
    serializado = await driver.getItemAsync(KEY_USUARIO);
  } else {
    serializado = memoriaStore.get(KEY_USUARIO) ?? null;
  }

  if (!serializado) {
    return null;
  }

  try {
    return JSON.parse(serializado) as AuthUsuario;
  } catch {
    return null;
  }
}

/**
 * Elimina los datos del usuario almacenados.
 */
export async function eliminarUsuario(): Promise<void> {
  const driver = await getDriver();
  if (driver) {
    await driver.deleteItemAsync(KEY_USUARIO).catch(() => {});
  }
  memoriaStore.delete(KEY_USUARIO);
}

/**
 * Limpia por completo la sesión (tokens y usuario).
 */
export async function limpiarSesion(): Promise<void> {
  await eliminarTokens();
  await eliminarUsuario();
}

export const authStorage = {
  guardarTokens,
  obtenerTokens,
  eliminarTokens,
  guardarUsuario,
  obtenerUsuario,
  eliminarUsuario,
  limpiarSesion,
};
