import type { AnyStatus } from "../../components/StatusBadge";
import {
  TICKET_STATUS,
  isAbandoned,
  type CategoryId,
  type SupportRequest,
  type Ticket,
} from "../../services/ticketService";

/** Un renglón de la lista: puede ser un ticket o una solicitud de autoservicio. */
export interface ListItem {
  id: string;
  kind: "ticket" | "solicitud";
  title: string;
  category: CategoryId;
  subcategory?: string;
  status: AnyStatus;
  date: string;
  active: boolean;
  needsAction: boolean;
  hint?: string;
  href: string;
}

export function buildItems(tickets: Ticket[], requests: SupportRequest[]): ListItem[] {
  const ticketItems: ListItem[] = tickets.map((t) => ({
    id: t.id,
    kind: "ticket",
    title: t.title,
    category: t.category,
    subcategory: t.subcategory,
    status: t.status,
    date: t.updatedAt,
    active: TICKET_STATUS[t.status].open,
    needsAction: t.status === "esperando_respuesta" || t.status === "resuelto",
    hint:
      t.status === "esperando_respuesta"
        ? "El técnico necesita tu respuesta"
        : t.status === "resuelto"
          ? "Confirma si quedó resuelto"
          : undefined,
    href: `/tickets/${t.id}`,
  }));

  const requestItems: ListItem[] = requests.map((r) => {
    const abandoned = isAbandoned(r);
    const status: AnyStatus =
      r.status === "resuelta_autoservicio"
        ? "resuelta"
        : r.status === "escalada"
          ? "convertida"
          : abandoned
            ? "abandonada"
            : "abierta";

    return {
      id: r.id,
      kind: "solicitud",
      title: r.title,
      category: r.category,
      subcategory: r.subcategory,
      status,
      date: r.resolvedAt ?? r.createdAt,
      active: status === "abierta",
      needsAction: status === "abierta",
      hint:
        status === "abierta"
          ? "Continúa revisando las sugerencias"
          : status === "convertida"
            ? `Ver ticket ${r.ticketId}`
            : undefined,
      href:
        status === "resuelta"
          ? `/solicitud/${r.id}/resuelta`
          : status === "convertida"
            ? `/tickets/${r.ticketId}`
            : `/solicitud/${r.id}/sugerencias`,
    };
  });

  // Primero lo que necesita acción, luego lo más reciente.
  return [...ticketItems, ...requestItems].sort(
    (a, b) => Number(b.needsAction) - Number(a.needsAction) || b.date.localeCompare(a.date),
  );
}

// ---------------- Filtros ----------------

export type DateRange = "todo" | "7dias" | "mes" | "personalizado";

export interface Filters {
  statuses: AnyStatus[];
  date: DateRange;
  from: string; // "AAAA-MM-DD" (solo personalizado)
  to: string;
}

export const EMPTY_FILTERS: Filters = { statuses: [], date: "todo", from: "", to: "" };

export const TICKET_FILTER_OPTIONS: AnyStatus[] = [
  "recibido",
  "en_cola",
  "en_proceso",
  "esperando_respuesta",
  "resuelto",
  "cerrado",
  "cancelado",
];

export const REQUEST_FILTER_OPTIONS: AnyStatus[] = ["abierta", "resuelta", "convertida", "abandonada"];

export function countFilters(filters: Filters) {
  return { statusCount: filters.statuses.length, hasDate: filters.date !== "todo" };
}

export function matchesFilters(item: ListItem, filters: Filters): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;

  const date = new Date(item.date);
  const now = new Date();
  if (filters.date === "7dias") {
    return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60_000;
  }
  if (filters.date === "mes") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (filters.date === "personalizado") {
    if (filters.from && date < new Date(`${filters.from}T00:00:00`)) return false;
    if (filters.to && date > new Date(`${filters.to}T23:59:59`)) return false;
  }
  return true;
}
