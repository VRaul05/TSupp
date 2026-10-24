/**
 * Asistente de IA (SIMULADO).
 * ------------------------------------------------------------
 * Imita lo que hará el backend con Ollama + la base de conocimiento:
 * recibe la solicitud y devuelve sugerencias paso a paso, cada una
 * con su fuente y su nivel de confianza (FR-06, FR-40, FR-42).
 *
 * La IA solo SUGIERE. Nunca ejecuta acciones por su cuenta (FR-45).
 *
 * TODO (cuando el backend esté listo): reemplazar `getSuggestions`
 * por un fetch a `${import.meta.env.VITE_API_URL}/ai/suggestions`.
 */
import type { SupportRequest } from "./ticketService";

export type Confidence = "alta" | "media" | "baja";

export interface Source {
  title: string;       // nombre del documento autorizado
  docId: string;
  section: string;
  relevance: number;   // 0 a 1
}

export interface Suggestion {
  id: string;
  title: string;
  confidence: Confidence;
  /** Los textos entre `comillas invertidas` se muestran como comando. */
  steps: string[];
  source: Source;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
}

/** Etapas que se muestran mientras "piensa". */
export const ANALYSIS_STAGES = [
  {
    title: "Buscando soluciones en la base de conocimiento…",
    detail: "Consultando guías técnicas autorizadas y diagnósticos previos de infraestructura y equipos.",
  },
  {
    title: "Comparando con casos resueltos…",
    detail: "Revisando incidencias similares que el equipo técnico ya validó.",
  },
  {
    title: "Preparando los pasos para ti…",
    detail: "Ordenando las soluciones de la más a la menos probable.",
  },
];

// ---------------- Base de conocimiento de ejemplo ----------------

const KB: Record<string, Suggestion[]> = {
  red: [
    {
      id: "kb-red-01",
      title: "Reiniciar adaptador de red y renovar IP",
      confidence: "alta",
      steps: [
        "Desconecta y vuelve a encender el interruptor de Wi-Fi en tu equipo.",
        "Abre la terminal o símbolo del sistema y ejecuta `ipconfig /renew`.",
        "Espera 30 segundos y reconecta a la red institucional 'CORP-WIFI'.",
      ],
      source: { title: "Guía de conectividad inalámbrica", docId: "TI-RED-004", section: "3.2 Renovación de IP", relevance: 0.92 },
    },
    {
      id: "kb-red-02",
      title: "Olvidar red e ingresar credenciales institucionales",
      confidence: "media",
      steps: [
        "Ve a Configuración > Redes e Internet > Wi-Fi.",
        "Selecciona 'Administrar redes conocidas' y elige 'Olvidar'.",
        "Selecciona la red e introduce usuario y contraseña de dominio actualizados.",
      ],
      source: { title: "Manual de acceso a red corporativa", docId: "TI-RED-011", section: "2.1 Perfiles de red", relevance: 0.74 },
    },
    {
      id: "kb-red-03",
      title: "Verificar conflicto con el software de VPN institucional",
      confidence: "baja",
      steps: [
        "Cierra sesión en el cliente VPN si está activo en segundo plano.",
        "Desactiva temporalmente el adaptador virtual desde el panel de control.",
        "Comprueba si la navegación en red local responde normalmente.",
      ],
      source: { title: "Problemas conocidos de VPN", docId: "TI-VPN-002", section: "Conflictos de adaptador", relevance: 0.51 },
    },
  ],
  computadora: [
    {
      id: "kb-pc-01",
      title: "Reinicio completo del equipo",
      confidence: "alta",
      steps: [
        "Guarda tu trabajo y cierra todas las aplicaciones.",
        "Selecciona Inicio > Apagar (no 'Suspender') y espera 10 segundos.",
        "Enciende el equipo y verifica si el problema continúa.",
      ],
      source: { title: "Guía básica de soporte a equipos", docId: "TI-PC-001", section: "1.1 Reinicio", relevance: 0.81 },
    },
    {
      id: "kb-pc-02",
      title: "Revisar espacio libre en disco",
      confidence: "media",
      steps: [
        "Abre el Explorador de archivos y entra a 'Este equipo'.",
        "Si el disco C: tiene menos de 10% libre, vacía la Papelera y la carpeta Descargas.",
        "Ejecuta 'Liberador de espacio en disco' desde el menú Inicio.",
      ],
      source: { title: "Mantenimiento preventivo de equipos", docId: "TI-PC-007", section: "Almacenamiento", relevance: 0.66 },
    },
  ],
  software: [
    {
      id: "kb-sw-01",
      title: "Cerrar y volver a abrir la aplicación",
      confidence: "alta",
      steps: [
        "Presiona `Ctrl + Shift + Esc` para abrir el Administrador de tareas.",
        "Busca la aplicación, selecciónala y elige 'Finalizar tarea'.",
        "Ábrela de nuevo desde el menú Inicio.",
      ],
      source: { title: "Software institucional: problemas frecuentes", docId: "TI-SW-003", section: "Bloqueos", relevance: 0.84 },
    },
    {
      id: "kb-sw-02",
      title: "Buscar actualizaciones pendientes",
      confidence: "media",
      steps: [
        "Abre 'Centro de software' desde el menú Inicio.",
        "Instala las actualizaciones marcadas como obligatorias.",
        "Reinicia el equipo cuando termine la instalación.",
      ],
      source: { title: "Política de actualizaciones", docId: "TI-SW-010", section: "Centro de software", relevance: 0.62 },
    },
  ],
  cuenta: [
    {
      id: "kb-cta-01",
      title: "Restablecer tu contraseña desde el portal de autoservicio",
      confidence: "alta",
      steps: [
        "Entra al portal de contraseñas institucional desde otro equipo o tu celular.",
        "Elige '¿Olvidaste tu contraseña?' y verifica tu identidad.",
        "Crea una contraseña nueva de al menos 12 caracteres y espera 5 minutos antes de usarla.",
      ],
      source: { title: "Gestión de cuentas de dominio", docId: "TI-CTA-002", section: "Autoservicio", relevance: 0.9 },
    },
  ],
  impresora: [
    {
      id: "kb-imp-01",
      title: "Limpiar la cola de impresión",
      confidence: "alta",
      steps: [
        "Abre Configuración > Bluetooth y dispositivos > Impresoras.",
        "Selecciona la impresora y elige 'Abrir cola de impresión'.",
        "Cancela todos los documentos pendientes y vuelve a imprimir.",
      ],
      source: { title: "Guía de impresoras de red", docId: "TI-IMP-001", section: "Cola de impresión", relevance: 0.86 },
    },
    {
      id: "kb-imp-02",
      title: "Revisar papel y tóner",
      confidence: "media",
      steps: [
        "Revisa en la pantalla de la impresora si hay mensajes de error.",
        "Verifica que la bandeja tenga papel y que no haya hojas atoradas.",
        "Si indica tóner bajo, avisa a tu área: el cambio lo hace el técnico.",
      ],
      source: { title: "Guía de impresoras de red", docId: "TI-IMP-001", section: "Consumibles", relevance: 0.7 },
    },
  ],
  iluminacion: [
    {
      id: "kb-ilu-01",
      title: "Verificar el apagador y el interruptor del área",
      confidence: "media",
      steps: [
        "Confirma que el apagador de la sala esté encendido.",
        "Si otras luces del piso también fallan, puede ser el interruptor general: no lo manipules.",
        "Si solo falla una lámpara, probablemente necesita cambio: crea el ticket.",
      ],
      source: { title: "Protocolo de mantenimiento eléctrico", docId: "MNT-ELE-003", section: "Revisión inicial", relevance: 0.64 },
    },
  ],
  climatizacion: [
    {
      id: "kb-clima-01",
      title: "Revisar el termostato de la sala",
      confidence: "media",
      steps: [
        "Verifica que el termostato esté en modo 'Frío' o 'Auto' y no en 'Ventilador'.",
        "Ajusta la temperatura a 23 °C y espera 10 minutos.",
        "Confirma que puertas y ventanas estén cerradas.",
      ],
      source: { title: "Manual de climatización", docId: "MNT-HVAC-002", section: "Termostatos", relevance: 0.6 },
    },
  ],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Devuelve sugerencias para la solicitud. Una lista vacía significa
 * "no encontré una sugerencia confiable" → se ofrece crear el ticket.
 */
export async function getSuggestions(
  request: SupportRequest,
  onStage?: (stageIndex: number) => void,
): Promise<SuggestionResult> {
  for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
    onStage?.(i);
    await wait(900);
  }

  // "Otro" lo clasifica un supervisor; no hay conocimiento que aplicar.
  if (request.category === "otro" || !request.subcategory) return { suggestions: [] };
  return { suggestions: KB[request.subcategory] ?? [] };
}
