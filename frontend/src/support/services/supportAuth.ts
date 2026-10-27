
const API_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'tsupp.support.jwt';

export type SupportRole = 'agent' | 'supervisor';

export interface SupportUser {
  id: string;
  name: string;
  email: string;
  role: 'employee' | SupportRole;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: SupportUser;
}

export async function loginSupport(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (response.status === 401) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  if (!response.ok) {
    throw new Error(`Error de autenticación: ${response.status}`);
  }

  const data: LoginResponse = await response.json();

  if (data.user.role !== 'agent' && data.user.role !== 'supervisor') {
    throw new Error('Esta cuenta no tiene acceso a la consola de soporte.');
  }

  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
}

export function getSupportToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function getSupportProfile(): Promise<SupportUser> {
  const token = getSupportToken();
  if (!token) throw new Error('No existe una sesión autenticada.');

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    clearSupportSession();
    throw new Error('La sesión expiró o ya no es válida.');
  }

  return response.json();
}

export function clearSupportSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
