import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, hasAcceptedPrivacy } from "../services/authService";

/**
 * Envuelve las pantallas que necesitan sesión.
 * Sin sesión → login. Sin aceptar el aviso → aviso de privacidad.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  if (!getCurrentUser()) return <Navigate to="/login" replace />;
  if (!hasAcceptedPrivacy()) return <Navigate to="/aviso-privacidad" replace />;
  return <>{children}</>;
}
