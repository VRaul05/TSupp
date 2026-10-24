/**
 * Notificaciones y preferencias (SIMULADO).
 * ------------------------------------------------------------
 * FR-14: el empleado recibe un aviso cada vez que su ticket cambia de
 * estado o recibe una respuesta. Aquí hay ejemplos que coinciden con los
 * tickets de la demo; con el backend real llegarán desde la API.
 *
 * TODO: reemplazar por `${import.meta.env.VITE_API_URL}/notificaciones`.
 */

export type NotificationType = "estado" | "respuesta" | "resuelto" | "aviso_global";

export interface AppNotification {
  id: string;
  type: NotificationType;
  tag: string;          // ej. "TI / Redes"
  title: string;
  ticketId?: string;    // se resalta dentro del título
  body: string;
  quote?: string;       // fragmento del mensaje del técnico
  domain?: "ti" | "edificio"; // para filtrar por dominio
  at: string;
  read: boolean;
}

export const TYPE_LABEL: Record<NotificationType, string> = {
  estado: "Cambios de estado",
  respuesta: "Respuestas técnicas",
  resuelto: "Tickets resueltos",
  aviso_global: "Avisos generales",
};

const KEY = "tsupp.notifications";
const PREFS_KEY = "tsupp.preferences";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function seed(): AppNotification[] {
  return [
    {
      id: "n-5",
      type: "estado",
      tag: "TI / Redes",
      title: "Tu ticket #TK-1082 pasó a En cola",
      ticketId: "TK-1082",
      domain: "ti",
      body: "El supervisor le asignó prioridad Media. Posición estimada: 3.",
      at: minutesAgo(10),
      read: false,
    },
    {
      id: "n-4",
      type: "respuesta",
      tag: "Respuesta técnica",
      title: "El técnico Carlos R. respondió tu ticket #TK-1042",
      ticketId: "TK-1042",
      domain: "ti",
      body: "Necesita información tuya para continuar.",
      quote: "Para autorizar tu equipo necesito una captura de la dirección MAC…",
      at: minutesAgo(40),
      read: false,
    },
    {
      id: "n-3",
      type: "resuelto",
      tag: "Resuelto",
      title: "Tu ticket #TK-1031 fue marcado como resuelto",
      ticketId: "TK-1031",
      domain: "ti",
      body: "Sofía P. registró la solución. Confírmala o indica si sigue fallando.",
      at: minutesAgo(30),
      read: false,
    },
    {
      id: "n-2",
      type: "aviso_global",
      tag: "Aviso general",
      domain: "ti",
      title: "Mantenimiento programado de servidores este sábado",
      body: "Habrá una ventana de indisponibilidad parcial de 23:00 a 03:00 h por actualizaciones.",
      at: minutesAgo(3 * 24 * 60),
      read: true,
    },
    {
      id: "n-1",
      type: "estado",
      tag: "Mantenimiento",
      title: "Tu ticket #TK-1007 fue cerrado",
      ticketId: "TK-1007",
      domain: "edificio",
      body: "Confirmaste que la cerradura del archivo quedó reparada.",
      at: minutesAgo(3 * 24 * 60 + 300),
      read: true,
    },
  ];
}

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : seed();
  } catch {
    return seed();
  }
}

function save(list: AppNotification[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento */
  }
  // Avisa a la barra inferior y a la campana para actualizar el contador.
  window.dispatchEvent(new Event("notifications-changed"));
}

export async function getNotifications(): Promise<AppNotification[]> {
  await new Promise((r) => setTimeout(r, 200));
  return load().sort((a, b) => b.at.localeCompare(a.at));
}

/** Se usa para el punto rojo de la campana (sin esperar). */
export function unreadCount(): number {
  return load().filter((n) => !n.read).length;
}

export function markRead(id: string) {
  save(load().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRead() {
  save(load().map((n) => ({ ...n, read: true })));
}

// ---------------- Preferencias ----------------

export interface Preferences {
  emailCopy: boolean;
  push: boolean;
  /** Recordatorios cuando un ticket espera tu respuesta (versión web). */
  reminders: boolean;
}

const DEFAULT_PREFS: Preferences = { emailCopy: true, push: false, reminders: true };

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Preferences) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* sin almacenamiento */
  }
}

/**
 * Pide permiso al navegador para mostrar notificaciones.
 * Las notificaciones push reales necesitan el backend; esto solo pide el permiso.
 */
export async function requestPushPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

// ---------------- Derechos ARCO ----------------

export type ArcoRight = "acceso" | "rectificacion" | "cancelacion" | "oposicion";

export const ARCO_LABEL: Record<ArcoRight, { title: string; help: string }> = {
  acceso: { title: "Acceso", help: "Conocer qué datos tuyos tiene el sistema." },
  rectificacion: { title: "Rectificación", help: "Corregir datos incorrectos o incompletos." },
  cancelacion: { title: "Cancelación", help: "Pedir que se eliminen tus datos." },
  oposicion: { title: "Oposición", help: "Oponerte a un uso específico de tus datos." },
};

/** Registra la solicitud ARCO; la atiende la Unidad de Transparencia. */
export async function submitArcoRequest(right: ArcoRight, detail: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 700));
  void right;
  void detail;
  // TODO: POST al backend. Por ahora devolvemos un folio de ejemplo.
  return `ARCO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
