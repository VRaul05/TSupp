/**
 * Servicio de autenticación (SIMULADO).
 * ------------------------------------------------------------
 * Mientras el backend (FastAPI) no tenga listo el endpoint de login,
 * esta función imita su comportamiento para poder probar las pantallas.
 *
 * Cuenta de prueba:  usuario.demo@institucion.mx  /  Demo1234
 * Tras 3 intentos fallidos la cuenta se bloquea 15 minutos.
 *
 * TODO (cuando el backend esté listo): reemplazar el cuerpo de `login`
 * por un fetch a `${import.meta.env.VITE_API_URL}/auth/login` y mapear
 * la respuesta al tipo `LoginResult`. Las pantallas no cambian.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "employee" | "agent" | "supervisor";
  area: string;
  sede?: string;
}

export type LoginResult =
  | { ok: true; user: User; privacyAccepted: boolean }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "locked"; unlockAt: number };

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;
const DEMO_EMAIL = "usuario.demo@institucion.mx";
const DEMO_PASSWORD = "Demo1234";

const PRIVACY_KEY = "tsupp.privacyAccepted";
const LOCK_KEY = "tsupp.loginLock";
const SESSION_KEY = "tsupp.session";

// --- Pequeños ayudantes para localStorage (puede fallar en modo privado) ---
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: seguimos sin guardar */
  }
}

type LockState = Record<string, { failed: number; unlockAt?: number }>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email: string, password: string): Promise<LoginResult> {
  await wait(700); // simula la latencia de red

  const key = email.trim().toLowerCase();
  const locks = readStorage<LockState>(LOCK_KEY, {});
  const entry = locks[key] ?? { failed: 0 };

  // ¿Sigue bloqueada?
  if (entry.unlockAt && entry.unlockAt > Date.now()) {
    return { ok: false, reason: "locked", unlockAt: entry.unlockAt };
  }

  if (key === DEMO_EMAIL && password === DEMO_PASSWORD) {
    delete locks[key];
    writeStorage(LOCK_KEY, locks);
    return {
      ok: true,
      user: saveSession({
        id: "u-001",
        name: "Ana López",
        email: DEMO_EMAIL,
        role: "employee",
        area: "Dirección Administrativa",
        sede: "Oficinas centrales",
      }),
      privacyAccepted: readStorage<boolean>(PRIVACY_KEY, false),
    };
  }

  // Credenciales incorrectas
  const failed = (entry.unlockAt ? 0 : entry.failed) + 1;
  if (failed >= MAX_ATTEMPTS) {
    const unlockAt = Date.now() + LOCK_MINUTES * 60_000;
    locks[key] = { failed, unlockAt };
    writeStorage(LOCK_KEY, locks);
    return { ok: false, reason: "locked", unlockAt };
  }

  locks[key] = { failed };
  writeStorage(LOCK_KEY, locks);
  return { ok: false, reason: "invalid", attemptsLeft: MAX_ATTEMPTS - failed };
}

// --- Sesión (simulada). Con el backend real aquí se guardaría el token. ---
function saveSession(user: User): User {
  writeStorage(SESSION_KEY, user);
  return user;
}

export function getCurrentUser(): User | null {
  return readStorage<User | null>(SESSION_KEY, null);
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nada */
  }
}

export function hasAcceptedPrivacy(): boolean {
  return readStorage<boolean>(PRIVACY_KEY, false);
}

export async function acceptPrivacyNotice(): Promise<void> {
  await wait(300);
  // TODO: POST al backend para registrar fecha/versión aceptada.
  writeStorage(PRIVACY_KEY, true);
}

/** Solo para pruebas: limpia bloqueos y aceptación del aviso. */
export function resetDemoState() {
  try {
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(PRIVACY_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("tsupp.tickets");
    localStorage.removeItem("tsupp.requests");
    localStorage.removeItem("tsupp.notifications");
    localStorage.removeItem("tsupp.preferences");
  } catch {
    /* nada */
  }
}
