/**
 * Servicio de solicitudes y tickets (SIMULADO).
 * ------------------------------------------------------------
 * Guarda los datos en localStorage para poder probar el flujo
 * completo sin backend.
 *
 * TODO (cuando el backend esté listo): reemplazar el cuerpo de las
 * funciones exportadas por llamadas a la API de FastAPI. Los tipos
 * y las pantallas no cambian.
 */

// ---------------- Catálogos ----------------

export type CategoryId = "ti" | "edificio" | "otro";

export interface Category {
  id: CategoryId;
  title: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "ti",
    title: "Tecnología / TI",
    description:
      "Computadoras, red Wi-Fi, software institucional, cuentas y acceso, o impresoras.",
  },
  {
    id: "edificio",
    title: "Edificio / Instalaciones",
    description:
      "Iluminación, salones, mobiliario, climatización, fontanería, cerraduras o accesos físicos.",
  },
  {
    id: "otro",
    title: "Otro / No estoy seguro",
    description: "Un supervisor clasificará tu solicitud manualmente.",
  },
];

/** Los íconos se eligen en la pantalla (ver SubcategorySelect). */
export interface Subcategory {
  id: string;
  label: string;
}

export const SUBCATEGORIES: Record<Exclude<CategoryId, "otro">, Subcategory[]> = {
  ti: [
    { id: "red", label: "Red / Wi-Fi" },
    { id: "computadora", label: "Computadora" },
    { id: "software", label: "Software" },
    { id: "cuenta", label: "Cuenta y contraseña" },
    { id: "impresora", label: "Impresora" },
    { id: "vpn", label: "VPN y acceso remoto" },
  ],
  edificio: [
    { id: "iluminacion", label: "Iluminación / eléctrico" },
    { id: "climatizacion", label: "Aire acondicionado / clima" },
    { id: "plomeria", label: "Plomería / fontanería" },
    { id: "mobiliario", label: "Mobiliario" },
    { id: "cerraduras", label: "Cerraduras y accesos" },
    { id: "salones", label: "Salones / espacios" },
    { id: "limpieza", label: "Limpieza y mantenimiento general" },
  ],
};

export const SINCE_OPTIONS = [
  "Hace unos minutos",
  "Hoy",
  "Ayer",
  "Esta semana",
  "Hace más de una semana",
] as const;

export type Scope = "individual" | "area" | "unknown";

export type Impact = "bloqueante" | "parcial" | "bajo";

export const IMPACT_OPTIONS: { id: Impact; label: string; description: string }[] = [
  { id: "bloqueante", label: "Bloqueante — No puedo realizar mis actividades", description: "Detiene por completo tareas importantes y no hay alternativa." },
  { id: "parcial", label: "Parcial — Puedo continuar con alternativas", description: "El trabajo sigue, pero más lento o con soluciones temporales." },
  { id: "bajo", label: "Bajo / Consulta — No afecta mi trabajo inmediato", description: "Solicitud preventiva o consulta de un procedimiento." },
];

export const IMPACT_LABEL: Record<Impact, string> = {
  bloqueante: "Bloqueante",
  parcial: "Parcial",
  bajo: "Bajo",
};

export const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: "individual", label: "Solo a mi equipo / individual" },
  { id: "area", label: "A varios compañeros / área completa" },
  { id: "unknown", label: "No estoy seguro" },
];

// ---------------- Reglas de evidencias ----------------

export const MAX_FILES = 5;
export const MAX_FILE_MB = 10;
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "txt", "log", "docx"];

/** Devuelve el motivo del rechazo o `null` si el archivo es válido. */
export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "No se pudo adjuntar: formato no permitido";
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `No se pudo adjuntar: el archivo supera ${MAX_FILE_MB} MB`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------- Solicitudes y tickets ----------------
//
// Flujo (FR-06 a FR-09):
//   1. Al enviar el formulario se crea una SOLICITUD (status "autoservicio").
//   2. La IA sugiere soluciones.
//   3a. Si se resolvió → la solicitud queda "resuelta_autoservicio" (NO hay ticket).
//   3b. Si no → se crea un TICKET para un técnico con todo lo que ya se intentó.

export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

export type RequestStatus = "autoservicio" | "resuelta_autoservicio" | "escalada";

export interface SupportRequest {
  id: string;                 // ej. "INC-4821"
  category: CategoryId;
  subcategory?: string;
  since?: string;
  scope?: Scope;
  errorMessage?: string;
  location?: string;
  impact?: Impact;
  inventoryTag?: string;
  title: string;
  description: string;
  attachments: AttachmentMeta[];
  status: RequestStatus;
  createdAt: string;
  resolvedAt?: string;
  ticketId?: string;          // si se escaló
  feedback?: Feedback;
}

export interface Feedback {
  rating: number;             // 1 a 5
  comment: string;
  aspects: string[];
}

/**
 * Estados del ticket que ve el EMPLEADO.
 * El ciclo interno (FR-17) es: Nuevo → Clasificado → Priorizado → En cola →
 * Asignado → En proceso → Resuelto → Cerrado. Para el empleado se agrupan así:
 *   recibido            = Nuevo, Clasificado, Priorizado
 *   en_cola             = En cola, Asignado
 *   en_proceso          = En proceso
 *   esperando_respuesta = En proceso, pero el técnico necesita algo del empleado
 *   resuelto            = Resuelto (el empleado confirma o reabre, FR-15)
 *   cerrado             = Cerrado
 *   cancelado           = el empleado lo canceló
 */
export type TicketStatus =
  | "recibido"
  | "en_cola"
  | "en_proceso"
  | "esperando_respuesta"
  | "resuelto"
  | "cerrado"
  | "cancelado";

export const TICKET_STATUS: Record<TicketStatus, { label: string; open: boolean }> = {
  recibido: { label: "Recibido", open: true },
  en_cola: { label: "En cola", open: true },
  en_proceso: { label: "En proceso", open: true },
  esperando_respuesta: { label: "Esperando tu respuesta", open: true },
  resuelto: { label: "Resuelto", open: true }, // sigue activo hasta que el empleado confirme
  cerrado: { label: "Cerrado", open: false },
  cancelado: { label: "Cancelado", open: false },
};

export type Priority = "baja" | "media" | "alta" | "critica";

export const PRIORITY_LABEL: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

/** Una entrada de la conversación / bitácora del ticket (FR-16). */
export interface TicketEvent {
  id: string;
  kind: "sistema" | "supervisor" | "tecnico" | "empleado";
  author: string;
  text: string;
  at: string;
  attachments?: string[];
}

export interface Ticket {
  id: string;                 // ej. "TK-1082"
  requestId?: string;
  title: string;
  description: string;
  category: CategoryId;
  subcategory?: string;
  location?: string;
  impact?: Impact;
  inventoryTag?: string;
  status: TicketStatus;
  priority?: Priority;
  createdAt: string;
  updatedAt: string;
  queuePosition?: number;
  statusNote?: string;
  technician?: { name: string; team: string };
  /** Lo que el técnico pidió (solo en "esperando_respuesta"). */
  pendingAction?: string;
  responseDeadlineHours?: number;
  attachments: string[];
  attemptedSteps?: number;    // sugerencias que el empleado probó
  suggestionIds?: string[];   // sugerencias de la IA que se mostraron
  estimatedResponse?: string; // siempre es un ESTIMADO (FR-12)
  events: TicketEvent[];
  /** Solución que registró el técnico al marcarlo como resuelto. */
  resolution?: Resolution;
  resolvedAt?: string;
  closedAt?: string;
  closedBy?: "empleado" | "automatico";
  serviceRating?: { rating: number; comment: string };
  reopenCount?: number;
}

export interface Resolution {
  technician: string;
  team: string;
  at: string;
  text: string;
  attachments: AttachmentMeta[];
}

/** Días hábiles para confirmar antes de que se cierre solo. */
export const AUTO_CLOSE_BUSINESS_DAYS = 5;
/** Días naturales en los que se puede reabrir un ticket cerrado. */
export const REOPEN_WINDOW_DAYS = 10;

export interface NewRequestInput {
  category: CategoryId;
  subcategory?: string;
  since?: string;
  scope?: Scope;
  errorMessage?: string;
  location?: string;
  impact?: Impact;
  inventoryTag?: string;
  title: string;
  description: string;
  files: File[];
}

const TICKETS_KEY = "tsupp.tickets";
const REQUESTS_KEY = "tsupp.requests";

/**
 * Los archivos (File) no se pueden guardar en localStorage, así que los
 * dejamos en memoria mientras la pestaña esté abierta. Con el backend real
 * se suben al servidor y esto desaparece.
 */
const filesInMemory = new Map<string, File[]>();

export function getRequestFiles(requestId: string): File[] {
  return filesInMemory.get(requestId) ?? [];
}

// ---------------- Datos de ejemplo ----------------

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const todayAt = (h: number, m: number) => new Date(new Date().setHours(h, m, 0, 0)).toISOString();
const daysAgo = (d: number, h = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, 0, 0, 0);
  return date.toISOString();
};

const ev = (kind: TicketEvent["kind"], author: string, text: string, at: string): TicketEvent => ({
  id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  kind,
  author,
  text,
  at,
});

function seedTickets(): Ticket[] {
  return [
    {
      id: "TK-1082",
      title: "Falla de conexión Wi-Fi en Sala Magna",
      description: "No hay internet en la Sala Magna desde la mañana.",
      category: "ti",
      subcategory: "red",
      location: "Edificio A, Sala Magna",
      status: "en_cola",
      priority: "media",
      createdAt: minutesAgo(25),
      updatedAt: minutesAgo(22),
      queuePosition: 3,
      estimatedResponse: "~4 h hábiles",
      attachments: ["captura_red.png"],
      attemptedSteps: 2,
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado con 1 captura adjunta y 2 sugerencias de autoservicio intentadas.", minutesAgo(25)),
        ev("sistema", "Clasificación automática", "Clasificado por categoría y enviado a la fila de Redes e Infraestructura.", minutesAgo(24)),
        ev("supervisor", "Supervisión de Mesa de Ayuda", "Prioridad asignada: Media.", minutesAgo(22)),
      ],
    },
    {
      id: "TK-1079",
      title: "Reparación de aire acondicionado (Piso 3)",
      description: "El aire acondicionado del piso 3 no enfría.",
      category: "edificio",
      subcategory: "climatizacion",
      location: "Edificio B, piso 3",
      status: "en_proceso",
      priority: "alta",
      createdAt: todayAt(9, 15),
      updatedAt: todayAt(10, 5),
      statusNote: "Técnico asignado en camino",
      technician: { name: "Luis M.", team: "Mantenimiento" },
      attachments: [],
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado sin evidencias adjuntas.", todayAt(9, 15)),
        ev("supervisor", "Supervisión de Mesa de Ayuda", "Prioridad asignada: Alta. Asignado a Luis M. (Mantenimiento).", todayAt(9, 40)),
        ev("tecnico", "Luis M.", "Voy en camino a revisar el equipo del piso 3.", todayAt(10, 5)),
      ],
    },
    {
      id: "TK-1042",
      title: "Falla de autenticación en Wi-Fi",
      description: "No consigo conectar la laptop corporativa al Wi-Fi; dice que mis credenciales son incorrectas.",
      category: "ti",
      subcategory: "red",
      status: "esperando_respuesta",
      priority: "alta",
      createdAt: daysAgo(1, 10),
      updatedAt: minutesAgo(40),
      technician: { name: "Carlos R.", team: "Redes" },
      pendingAction:
        "Solicitó una captura de la dirección MAC de tu equipo para autorizar el acceso.",
      responseDeadlineHours: 48,
      attachments: [],
      attemptedSteps: 3,
      events: [
        ev("empleado", "Ana López", "No consigo conectar la laptop corporativa al Wi-Fi; dice que mis credenciales son incorrectas.", daysAgo(1, 10)),
        ev("supervisor", "Supervisión de Mesa de Ayuda", "Prioridad asignada: Alta. Asignado a Carlos R. (Redes).", daysAgo(1, 11)),
        ev("tecnico", "Carlos R.", "Hola Ana, para autorizar tu equipo necesito una captura de la dirección MAC. Abre la terminal y ejecuta: ipconfig /all. Envíame la línea \"Dirección física\" del adaptador Wi-Fi.", minutesAgo(40)),
      ],
    },
    {
      id: "TK-1031",
      title: "Impresora del piso 2 no imprime",
      description: "La impresora compartida del piso 2 marca error de papel.",
      category: "ti",
      subcategory: "impresora",
      status: "resuelto",
      priority: "baja",
      createdAt: daysAgo(3, 9),
      updatedAt: minutesAgo(30),
      resolvedAt: minutesAgo(30),
      technician: { name: "Sofía P.", team: "Soporte en sitio" },
      attachments: [],
      resolution: {
        technician: "Sofía P.",
        team: "Soporte en sitio",
        at: minutesAgo(30),
        text: "Se retiró una hoja atorada y se limpió el rodillo de alimentación. También se reinstaló el controlador en tu equipo. Por favor imprime una página de prueba para confirmar.",
        attachments: [{ name: "guia_impresoras_red.pdf", size: 1.2 * 1024 * 1024, type: "application/pdf" }],
      },
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado.", daysAgo(3, 9)),
        ev("supervisor", "Supervisión de Mesa de Ayuda", "Prioridad asignada: Baja. Asignado a Sofía P. (Soporte en sitio).", daysAgo(3, 10)),
        ev("tecnico", "Sofía P.", "Marqué el ticket como resuelto. Te dejé la guía de impresoras de red.", minutesAgo(30)),
      ],
    },
    {
      id: "TK-1007",
      title: "Cambio de cerradura en archivo",
      description: "La cerradura del archivo no abre con la llave.",
      category: "edificio",
      subcategory: "cerraduras",
      status: "cerrado",
      priority: "media",
      createdAt: daysAgo(5, 9),
      updatedAt: daysAgo(3, 16),
      resolvedAt: daysAgo(4, 12),
      closedAt: daysAgo(3, 16),
      closedBy: "empleado",
      technician: { name: "Luis M.", team: "Mantenimiento" },
      attachments: [],
      resolution: {
        technician: "Luis M.",
        team: "Mantenimiento",
        at: daysAgo(4, 12),
        text: "Se reemplazó el cilindro de la cerradura y se entregaron dos llaves nuevas al responsable del archivo.",
        attachments: [],
      },
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado.", daysAgo(5, 9)),
        ev("tecnico", "Luis M.", "Se reemplazó el cilindro de la cerradura.", daysAgo(4, 12)),
        ev("empleado", "Ana López", "Confirmé que el problema quedó resuelto.", daysAgo(3, 16)),
      ],
    },
    {
      id: "TK-0985",
      title: "Lámpara fundida en recepción",
      description: "Una lámpara del techo de recepción no enciende.",
      category: "edificio",
      subcategory: "iluminacion",
      status: "cerrado",
      priority: "baja",
      createdAt: daysAgo(25, 9),
      updatedAt: daysAgo(18, 10),
      resolvedAt: daysAgo(24, 13),
      closedAt: daysAgo(18, 10),
      closedBy: "automatico",
      technician: { name: "Luis M.", team: "Mantenimiento" },
      attachments: [],
      serviceRating: { rating: 4, comment: "Rápido, gracias." },
      resolution: {
        technician: "Luis M.",
        team: "Mantenimiento",
        at: daysAgo(24, 13),
        text: "Se cambió la lámpara por una LED nueva.",
        attachments: [],
      },
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado.", daysAgo(25, 9)),
        ev("tecnico", "Luis M.", "Se cambió la lámpara por una LED nueva.", daysAgo(24, 13)),
        ev("sistema", "Registro del sistema", "Cerrado automáticamente: no hubo respuesta en 5 días hábiles.", daysAgo(18, 10)),
      ],
    },
    {
      id: "TK-0998",
      title: "Instalación de software de diseño",
      description: "Necesito el software de diseño para un proyecto.",
      category: "ti",
      subcategory: "software",
      status: "cancelado",
      priority: "baja",
      createdAt: daysAgo(20, 9),
      updatedAt: daysAgo(20, 15),
      attachments: [],
      events: [
        ev("sistema", "Registro del sistema", "Ticket creado.", daysAgo(20, 9)),
        ev("empleado", "Ana López", "Cancelé el ticket: ya no es necesario.", daysAgo(20, 15)),
      ],
    },
  ];
}

function seedRequests(): SupportRequest[] {
  return [
    {
      id: "INC-4810",
      category: "ti",
      subcategory: "cuenta",
      title: "Olvidé mi contraseña del correo",
      description: "No recuerdo mi contraseña del correo institucional.",
      attachments: [],
      status: "resuelta_autoservicio",
      createdAt: daysAgo(5, 8),
      resolvedAt: daysAgo(5, 8),
    },
    {
      id: "INC-4802",
      category: "ti",
      subcategory: "computadora",
      title: "La computadora va muy lenta",
      description: "Mi equipo tarda mucho en abrir programas.",
      attachments: [],
      status: "autoservicio", // nunca se decidió → "Abandonada"
      createdAt: daysAgo(8, 12),
    },
  ];
}

// ---------------- Almacenamiento ----------------

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}

/** Completa campos que no existían en versiones anteriores de la demo. */
function normalizeTicket(t: Partial<Ticket> & { id: string }): Ticket {
  return {
    title: "",
    description: "",
    category: "otro",
    status: "en_cola",
    attachments: [],
    ...t,
    createdAt: t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
    events: t.events ?? [],
  } as Ticket;
}

/** Suma días hábiles (lunes a viernes) a una fecha. */
export function addBusinessDays(iso: string, days: number): Date {
  const date = new Date(iso);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

/** Fecha en la que un ticket resuelto se cierra solo si el empleado no responde. */
export function autoCloseDate(ticket: Ticket): Date | null {
  if (ticket.status !== "resuelto" || !ticket.resolvedAt) return null;
  return addBusinessDays(ticket.resolvedAt, AUTO_CLOSE_BUSINESS_DAYS);
}

/** ¿Todavía se puede reabrir? (resuelto, o cerrado hace menos de 10 días) */
export function reopenDeadline(ticket: Ticket): Date | null {
  if (ticket.status === "resuelto") return autoCloseDate(ticket);
  if (ticket.status !== "cerrado" || !ticket.closedAt) return null;
  const limit = new Date(ticket.closedAt);
  limit.setDate(limit.getDate() + REOPEN_WINDOW_DAYS);
  return limit;
}

export function canReopen(ticket: Ticket): boolean {
  const deadline = reopenDeadline(ticket);
  return deadline !== null && deadline.getTime() > Date.now();
}

/** Simula el proceso del servidor que cierra los tickets resueltos sin respuesta. */
function applyAutoClose(ticket: Ticket): Ticket {
  const limit = autoCloseDate(ticket);
  if (!limit || limit.getTime() > Date.now()) return ticket;
  const at = limit.toISOString();
  return {
    ...ticket,
    status: "cerrado",
    closedAt: at,
    closedBy: "automatico",
    updatedAt: at,
    events: [
      ...ticket.events,
      ev("sistema", "Registro del sistema", `Cerrado automáticamente: no hubo respuesta en ${AUTO_CLOSE_BUSINESS_DAYS} días hábiles.`, at),
    ],
  };
}

function loadTickets(): Ticket[] {
  return load<Ticket[]>(TICKETS_KEY, seedTickets).map(normalizeTicket).map(applyAutoClose);
}

function loadRequests(): SupportRequest[] {
  return load<SupportRequest[]>(REQUESTS_KEY, seedRequests);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Tiempo de respuesta ESTIMADO según la categoría (luego vendrá del SLA configurado). */
export const ESTIMATES: Record<CategoryId, string> = {
  ti: "Menos de 2 horas",
  edificio: "Menos de 4 horas",
  otro: "Menos de 8 horas",
};

// ---------------- Solicitudes ----------------

export async function createRequest(input: NewRequestInput): Promise<SupportRequest> {
  await wait(600);
  const requests = loadRequests();
  const nextNumber = Math.max(4820, ...requests.map((r) => Number(r.id.slice(4)) || 0)) + 1;

  const request: SupportRequest = {
    id: `INC-${nextNumber}`,
    category: input.category,
    subcategory: input.subcategory,
    since: input.since,
    scope: input.scope,
    errorMessage: input.errorMessage,
    location: input.location,
    impact: input.impact,
    inventoryTag: input.inventoryTag,
    title: input.title.trim(),
    description: input.description.trim(),
    attachments: input.files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    status: "autoservicio",
    createdAt: new Date().toISOString(),
  };

  filesInMemory.set(request.id, input.files);
  save(REQUESTS_KEY, [request, ...requests]);
  return request;
}

export async function getRequest(id: string): Promise<SupportRequest | null> {
  await wait(150);
  return loadRequests().find((r) => r.id === id) ?? null;
}

export async function getMyRequests(): Promise<SupportRequest[]> {
  await wait(200);
  return loadRequests();
}

function updateRequest(id: string, changes: Partial<SupportRequest>) {
  const updated = loadRequests().map((r) => (r.id === id ? { ...r, ...changes } : r));
  save(REQUESTS_KEY, updated);
  return updated.find((r) => r.id === id) ?? null;
}

/** Una solicitud sin decisión por más de 24 h se considera abandonada. */
export function isAbandoned(request: SupportRequest): boolean {
  return (
    request.status === "autoservicio" &&
    Date.now() - new Date(request.createdAt).getTime() > 24 * 60 * 60_000
  );
}

/** FR-07/FR-08: el empleado indica que la sugerencia lo resolvió. */
export async function markResolvedBySelfService(id: string): Promise<void> {
  await wait(400);
  updateRequest(id, { status: "resuelta_autoservicio", resolvedAt: new Date().toISOString() });
}

/** FR-08: calificación opcional. No modifica la base de conocimiento automáticamente. */
export async function sendFeedback(id: string, feedback: Feedback): Promise<void> {
  await wait(500);
  updateRequest(id, { feedback });
}

/** FR-09: no se resolvió → se crea el ticket con todo el contexto. */
export async function escalateToTicket(
  requestId: string,
  context: { suggestionIds: string[]; attemptedSteps: number },
): Promise<Ticket> {
  await wait(900);
  const request = await getRequest(requestId);
  if (!request) throw new Error("Solicitud no encontrada");
  if (request.ticketId) {
    const existing = loadTickets().find((t) => t.id === request.ticketId);
    if (existing) return existing; // evita crear dos tickets si se presiona dos veces
  }

  const tickets = loadTickets();
  const nextNumber = Math.max(1082, ...tickets.map((t) => Number(t.id.slice(3)) || 0)) + 1;
  const now = new Date().toISOString();
  const files = request.attachments.length;

  const ticket: Ticket = {
    id: `TK-${nextNumber}`,
    requestId,
    title: request.title,
    description: request.description,
    category: request.category,
    subcategory: request.subcategory,
    location: request.location,
    impact: request.impact,
    inventoryTag: request.inventoryTag,
    status: "recibido",
    createdAt: now,
    updatedAt: now,
    queuePosition: tickets.filter((t) => t.status === "en_cola" || t.status === "recibido").length + 1,
    attachments: request.attachments.map((a) => a.name),
    attemptedSteps: context.attemptedSteps,
    suggestionIds: context.suggestionIds,
    estimatedResponse: ESTIMATES[request.category],
    events: [
      ev(
        "sistema",
        "Registro del sistema",
        `Ticket creado a partir de la solicitud ${requestId} con ${files} ${files === 1 ? "archivo adjunto" : "archivos adjuntos"} y ${context.attemptedSteps} ${context.attemptedSteps === 1 ? "sugerencia intentada" : "sugerencias intentadas"}.`,
        now,
      ),
      ev("empleado", "Tú", request.description, now),
    ],
  };

  save(TICKETS_KEY, [ticket, ...tickets]);
  updateRequest(requestId, { status: "escalada", ticketId: ticket.id });
  return ticket;
}

// ---------------- Tickets ----------------

export async function getMyTickets(): Promise<Ticket[]> {
  await wait(250);
  return loadTickets();
}

export async function getTicket(id: string): Promise<Ticket | null> {
  await wait(150);
  return loadTickets().find((t) => t.id === id) ?? null;
}

function updateTicket(id: string, change: (t: Ticket) => Ticket): Ticket {
  let result: Ticket | null = null;
  const tickets = loadTickets().map((t) => {
    if (t.id !== id) return t;
    result = { ...change(t), updatedAt: new Date().toISOString() };
    return result;
  });
  if (!result) throw new Error("Ticket no encontrado");
  save(TICKETS_KEY, tickets);
  return result;
}

/**
 * FR-15: el empleado agrega un comentario. Si el técnico esperaba su
 * respuesta, el ticket regresa a "En proceso".
 */
export async function addComment(id: string, text: string, files: File[]): Promise<Ticket> {
  await wait(500);
  return updateTicket(id, (t) => ({
    ...t,
    status: t.status === "esperando_respuesta" ? "en_proceso" : t.status,
    pendingAction: t.status === "esperando_respuesta" ? undefined : t.pendingAction,
    events: [
      ...t.events,
      {
        ...ev("empleado", "Tú", text.trim(), new Date().toISOString()),
        attachments: files.map((f) => f.name),
      },
    ],
  }));
}

/** FR-15: el empleado confirma que quedó resuelto → Cerrado. */
export async function confirmResolution(id: string): Promise<Ticket> {
  await wait(500);
  const now = new Date().toISOString();
  return updateTicket(id, (t) => ({
    ...t,
    status: "cerrado",
    closedAt: now,
    closedBy: "empleado",
    events: [...t.events, ev("empleado", "Tú", "Confirmé que el problema quedó resuelto.", now)],
  }));
}

/**
 * FR-15 / FR-17: reabrir (desde Resuelto, o desde Cerrado dentro de 10 días).
 * El ticket regresa a "En proceso" con el mismo técnico.
 */
export async function reopenTicket(id: string, reason: string, files: File[]): Promise<Ticket> {
  await wait(700);
  const current = loadTickets().find((t) => t.id === id);
  if (!current || !canReopen(current)) {
    throw new Error("Este ticket ya no se puede reabrir");
  }
  const now = new Date().toISOString();
  return updateTicket(id, (t) => ({
    ...t,
    status: "en_proceso",
    closedAt: undefined,
    closedBy: undefined,
    resolvedAt: undefined,
    reopenCount: (t.reopenCount ?? 0) + 1,
    events: [
      ...t.events,
      {
        ...ev("empleado", "Tú", `Reabrí el ticket: ${reason.trim()}`, now),
        attachments: files.map((f) => f.name),
      },
      ev("sistema", "Registro del sistema", `Ticket reabierto y regresado a ${t.technician?.name ?? "la fila de atención"}.`, now),
    ],
  }));
}

/** Calificación del servicio técnico (opcional, se puede enviar una vez). */
export async function rateService(id: string, rating: number, comment: string): Promise<Ticket> {
  await wait(500);
  return updateTicket(id, (t) => ({ ...t, serviceRating: { rating, comment: comment.trim() } }));
}

export async function cancelTicket(id: string, reason: string): Promise<Ticket> {
  await wait(500);
  return updateTicket(id, (t) => ({
    ...t,
    status: "cancelado",
    pendingAction: undefined,
    events: [
      ...t.events,
      ev("empleado", "Tú", `Cancelé el ticket${reason ? `: ${reason}` : "."}`, new Date().toISOString()),
    ],
  }));
}

/** Nombre legible de la subcategoría (o de la categoría si no hay). */
export function categoryLabel(category: CategoryId, subcategory?: string): string {
  if (category !== "otro" && subcategory) {
    const found = SUBCATEGORIES[category].find((s) => s.id === subcategory);
    if (found) return found.label;
  }
  return CATEGORIES.find((c) => c.id === category)?.title ?? "Sin clasificar";
}

// ---------------- Ayudantes de presentación ----------------

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const time = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday) return `Hoy, ${time}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
