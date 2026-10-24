import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BellRing,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Download,
  FileDown,
  History,
  ListFilter,
  MapPin,
  MessageSquareText,
  Monitor,
  PanelRight,
  Reply,
  Search,
  Star,
  Ticket as TicketIcon,
  UserCog,
  X,
} from "lucide-react";

import { WebShell } from "../../components/web/WebShell";
import { StatusBadge, STATUS_META, type AnyStatus } from "../../components/StatusBadge";
import { getCurrentUser } from "../../services/authService";
import {
  PRIORITY_LABEL,
  TICKET_STATUS,
  categoryLabel,
  getMyRequests,
  getMyTickets,
  isAbandoned,
  timeAgo,
  type CategoryId,
  type SupportRequest,
  type Ticket,
} from "../../services/ticketService";
import { printReceipt } from "../../components/web/receipt";
import "./MyRequestsWeb.css";

type Tab = "tickets" | "autoservicio";
type DateFilter = "todo" | "7" | "30" | "mes";

interface Row {
  id: string;
  kind: Tab;
  title: string;
  subtitle: string;
  domain: CategoryId;
  status: AnyStatus;
  createdAt: string;
  updatedAt: string;
  needsAction: boolean;
  ticket?: Ticket;
  request?: SupportRequest;
}

const DOMAIN: Record<CategoryId, { label: string; icon: React.ReactNode }> = {
  ti: { label: "TI", icon: <Monitor size={12} /> },
  edificio: { label: "Instalaciones", icon: <Building2 size={12} /> },
  otro: { label: "Otro", icon: <CircleHelp size={12} /> },
};

const TICKET_STATUSES: AnyStatus[] = ["recibido", "en_cola", "en_proceso", "esperando_respuesta", "resuelto", "cerrado", "cancelado"];
const REQUEST_STATUSES: AnyStatus[] = ["abierta", "resuelta", "convertida", "abandonada"];

function requestStatus(r: SupportRequest): AnyStatus {
  if (r.status === "resuelta_autoservicio") return "resuelta";
  if (r.status === "escalada") return "convertida";
  return isAbandoned(r) ? "abandonada" : "abierta";
}

function toRows(tickets: Ticket[], requests: SupportRequest[]): Row[] {
  return [
    ...tickets.map<Row>((t) => ({
      id: t.id,
      kind: "tickets",
      title: t.title,
      subtitle: t.description,
      domain: t.category,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      needsAction: t.status === "esperando_respuesta" || t.status === "resuelto",
      ticket: t,
    })),
    ...requests.map<Row>((r) => {
      const status = requestStatus(r);
      return {
        id: r.id,
        kind: "autoservicio",
        title: r.title,
        subtitle: r.description,
        domain: r.category,
        status,
        createdAt: r.createdAt,
        updatedAt: r.resolvedAt ?? r.createdAt,
        needsAction: status === "abierta",
        request: r,
      };
    }),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

/** Descarga un archivo de texto generado en el navegador. */
function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(rows: Row[], tab: Tab) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["ID", "Título", "Dominio", "Subcategoría", "Estado", "Creado", "Actualizado"];
  const lines = rows.map((r) =>
    [
      r.id,
      r.title,
      DOMAIN[r.domain].label,
      categoryLabel(r.domain, r.ticket?.subcategory ?? r.request?.subcategory),
      STATUS_META[r.status].label,
      fmtDate(r.createdAt),
      fmtDate(r.updatedAt),
    ]
      .map(esc)
      .join(","),
  );
  // "﻿" hace que Excel lea bien los acentos.
  downloadText(`mis-solicitudes-${tab}.csv`, "﻿" + [header.join(","), ...lines].join("\n"), "text/csv;charset=utf-8");
}

function downloadReceipt(row: Row) {
  const user = getCurrentUser();
  const t = row.ticket;
  printReceipt(
    row.id,
    [
      ["Solicitante", user ? `${user.name} (${user.email})` : ""],
      ["Título", row.title],
      ["Dominio", `${DOMAIN[row.domain].label} · ${categoryLabel(row.domain, t?.subcategory ?? row.request?.subcategory)}`],
      ["Estado actual", STATUS_META[row.status].label],
      ["Creado", fmtDate(row.createdAt)],
      ["Última actualización", fmtDate(row.updatedAt)],
      ["Técnico", t?.technician ? `${t.technician.name} (${t.technician.team})` : ""],
      ["Ubicación", t?.location ?? row.request?.location ?? ""],
    ],
    row.subtitle,
  );
}

/** FR-10 / FR-13: "Mis solicitudes" en computadora. */
export function MyRequestsWeb() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "autoservicio" ? "autoservicio" : "tickets";

  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AnyStatus | "">("");
  const [date, setDate] = useState<DateFilter>("todo");
  const [domain, setDomain] = useState<CategoryId | "">("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    Promise.all([getMyTickets(), getMyRequests()]).then(([t, r]) => setRows(toRows(t, r)));
  }, []);

  const all = rows ?? [];
  const tabRows = all.filter((r) => r.kind === tab);
  const ticketRows = all.filter((r) => r.kind === "tickets");

  const stats = {
    active: ticketRows.filter((r) => r.ticket && TICKET_STATUS[r.ticket.status].open).length,
    waiting: ticketRows.filter((r) => r.status === "esperando_respuesta").length,
    history: all.filter((r) => ["cerrado", "cancelado", "resuelta", "convertida", "abandonada"].includes(r.status)).length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return tabRows.filter((r) => {
      if (q && !`${r.id} ${r.title} ${r.subtitle}`.toLowerCase().includes(q)) return false;
      if (status && r.status !== status) return false;
      if (domain && r.domain !== domain) return false;
      const d = new Date(r.updatedAt);
      if (date === "7" && now - d.getTime() > 7 * 864e5) return false;
      if (date === "30" && now - d.getTime() > 30 * 864e5) return false;
      if (date === "mes" && (d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear())) return false;
      return true;
    });
  }, [tabRows, query, status, domain, date]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Selección por defecto: lo que requiere tu acción, si no el primero.
  const selected =
    filtered.find((r) => r.id === selectedId) ??
    filtered.find((r) => r.needsAction) ??
    filtered[0] ??
    null;

  function changeTab(next: Tab) {
    setParams(next === "autoservicio" ? { tab: "autoservicio" } : {}, { replace: true });
    setStatus("");
    setPage(1);
    setSelectedId(null);
  }

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const hasFilters = Boolean(query || status || domain || date !== "todo");

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">Inicio</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Mis solicitudes</span>
      </nav>

      <header className="mrw-head">
        <div>
          <h1>Mis solicitudes</h1>
          <p>Consulta y da seguimiento a tus reportes de soporte técnico e instalaciones.</p>
        </div>
        <div className="mrw-stats">
          <span className="mrw-stat">
            <span className="mrw-stat__dot" /> {stats.active} tickets activos
          </span>
          {stats.waiting > 0 && (
            <span className="mrw-stat mrw-stat--pink">
              <CircleAlert size={13} /> {stats.waiting} {stats.waiting === 1 ? "requiere" : "requieren"} tu respuesta
            </span>
          )}
          <span className="mrw-stat mrw-stat--plain">
            <History size={13} /> {stats.history} en historial
          </span>
        </div>
      </header>

      <div className="mrw-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "tickets"} className={tab === "tickets" ? "is-on" : ""} onClick={() => changeTab("tickets")}>
          <TicketIcon size={16} /> Tickets <span>{all.filter((r) => r.kind === "tickets").length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "autoservicio"} className={tab === "autoservicio" ? "is-on" : ""} onClick={() => changeTab("autoservicio")}>
          <Bot size={16} /> Autoservicio IA <span>{all.filter((r) => r.kind === "autoservicio").length}</span>
        </button>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="mrw-toolbar">
        <label className="mrw-search">
          <Search size={16} />
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar por folio, título o palabra clave…"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
          />
        </label>

        <label className="mrw-select">
          <ListFilter size={15} />
          <span>Estado:</span>
          <select value={status} onChange={(e) => resetPage(setStatus)(e.target.value as AnyStatus | "")}>
            <option value="">Todos</option>
            {(tab === "tickets" ? TICKET_STATUSES : REQUEST_STATUSES).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>

        <label className="mrw-select">
          <CalendarDays size={15} />
          <span className="sr-only">Fecha</span>
          <select value={date} onChange={(e) => resetPage(setDate)(e.target.value as DateFilter)}>
            <option value="todo">Cualquier fecha</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="mes">Este mes</option>
          </select>
        </label>

        <label className={`mrw-select ${domain ? "is-on" : ""}`}>
          <Building2 size={15} />
          <span>Dominio:</span>
          <select value={domain} onChange={(e) => resetPage(setDomain)(e.target.value as CategoryId | "")}>
            <option value="">Todos</option>
            <option value="ti">TI</option>
            <option value="edificio">Instalaciones</option>
            <option value="otro">Otro</option>
          </select>
        </label>

        <button type="button" className="mrw-export" onClick={() => exportCsv(filtered, tab)} disabled={filtered.length === 0}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className={`mrw ${panelOpen && selected ? "" : "mrw--full"}`}>
        {/* ---------- Tabla ---------- */}
        <section className="mrw-table-card">
          {rows === null ? (
            <div className="mrw-loading">
              <div className="home__skeleton" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="mrw-empty">
              <Search size={28} />
              <p>{hasFilters ? "Ninguna solicitud coincide con los filtros." : "Todavía no tienes solicitudes aquí."}</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                    setDomain("");
                    setDate("todo");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="mrw-table">
              <thead>
                <tr>
                  <th scope="col">Folio</th>
                  <th scope="col">Título</th>
                  <th scope="col">Dominio</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const isSel = selected?.id === r.id && panelOpen;
                  const done = ["cerrado", "cancelado", "abandonada"].includes(r.status);
                  return (
                    <tr
                      key={r.id}
                      className={`${isSel ? "is-selected" : ""} ${done ? "is-done" : ""}`}
                      onClick={() => {
                        setSelectedId(r.id);
                        setPanelOpen(true);
                      }}
                    >
                      <td className="mrw-id">
                        {r.needsAction && <span className="mrw-dot" aria-label="Requiere tu atención" />}#{r.id}
                      </td>
                      <td className="mrw-title-cell">
                        <button
                          type="button"
                          className="mrw-title"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(r.id);
                            setPanelOpen(true);
                          }}
                        >
                          {r.title}
                        </button>
                        <small>{r.subtitle}</small>
                      </td>
                      <td>
                        <span className="mrw-domain">
                          {DOMAIN[r.domain].icon} {DOMAIN[r.domain].label}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.ticket?.status === "en_cola" && r.ticket.queuePosition && (
                          <small className="mrw-pos">Posición {r.ticket.queuePosition}</small>
                        )}
                      </td>
                      <td className="mrw-date">{timeAgo(r.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {filtered.length > 0 && (
            <footer className="mrw-pager">
              <span>
                Mostrando {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} de{" "}
                {filtered.length}
              </span>
              <label>
                Filas:
                <select value={pageSize} onChange={(e) => resetPage(setPageSize)(Number(e.target.value))}>
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </select>
              </label>
              <nav aria-label="Páginas">
                <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 1} aria-label="Página anterior">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className={n === safePage ? "is-on" : ""} aria-current={n === safePage ? "page" : undefined} onClick={() => setPage(n)}>
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage === pages} aria-label="Página siguiente">
                  <ChevronRight size={16} />
                </button>
              </nav>
            </footer>
          )}
        </section>

        {/* ---------- Detalle rápido ---------- */}
        {panelOpen && selected ? (
          <QuickDetail row={selected} onClose={() => setPanelOpen(false)} onNavigate={navigate} />
        ) : (
          selected && (
            <button type="button" className="mrw-open-panel" onClick={() => setPanelOpen(true)}>
              <PanelRight size={16} /> Mostrar detalle
            </button>
          )
        )}
      </div>
    </WebShell>
  );
}

// ---------------------------------------------------------------------------

function QuickDetail({
  row,
  onClose,
  onNavigate,
}: {
  row: Row;
  onClose: () => void;
  onNavigate: (to: string) => void;
}) {
  const t = row.ticket;
  const r = row.request;
  const lastTech = t?.events.filter((e) => e.kind === "tecnico").at(-1);

  let primary: { label: string; to: string; icon: React.ReactNode } = {
    label: "Ver detalle completo",
    to: `/tickets/${row.id}`,
    icon: <MessageSquareText size={16} />,
  };
  if (t?.status === "esperando_respuesta") primary = { label: "Responder al técnico", to: `/tickets/${t.id}`, icon: <Reply size={16} /> };
  if (t?.status === "resuelto") primary = { label: "Confirmar o reabrir", to: `/tickets/${t.id}`, icon: <CircleCheck size={16} /> };
  if (r) {
    if (row.status === "convertida") primary = { label: `Ver ticket ${r.ticketId}`, to: `/tickets/${r.ticketId}`, icon: <TicketIcon size={16} /> };
    else if (row.status === "resuelta") primary = { label: "Ver resolución", to: `/solicitud/${r.id}/resuelta`, icon: <CircleCheck size={16} /> };
    else primary = { label: row.status === "abandonada" ? "Retomar sugerencias" : "Continuar con sugerencias", to: `/solicitud/${r.id}/sugerencias`, icon: <Bot size={16} /> };
  }

  return (
    <aside className="mrw-panel" aria-label={`Detalle rápido de ${row.id}`}>
      <header className="mrw-panel__head">
        <h2>
          <PanelRight size={18} /> Detalle rápido
        </h2>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle">
          <X size={18} />
        </button>
      </header>

      <div className="mrw-panel__body">
        <div className="mrw-panel__top">
          <strong>#{row.id}</strong>
          <StatusBadge status={row.status} />
        </div>

        {t?.status === "esperando_respuesta" && (
          <p className="mrw-alert mrw-alert--pink">
            <BellRing size={16} /> {t.pendingAction ?? "El técnico necesita información tuya."}
          </p>
        )}
        {t?.status === "resuelto" && (
          <p className="mrw-alert mrw-alert--green">
            <CircleCheck size={16} /> El técnico marcó el ticket como resuelto. Confírmalo o reábrelo.
          </p>
        )}
        {row.status === "abierta" && (
          <p className="mrw-alert">
            <Bot size={16} /> Aún no decides si las sugerencias de la IA te sirvieron.
          </p>
        )}

        <p className="mrw-panel__label">Problema reportado</p>
        <h3 className="mrw-panel__title">{row.title}</h3>

        <dl className="mrw-info">
          <div>
            <dt>
              <Building2 size={14} /> Dominio
            </dt>
            <dd>
              {DOMAIN[row.domain].label} ({categoryLabel(row.domain, t?.subcategory ?? r?.subcategory)})
            </dd>
          </div>
          {(t?.location || r?.location) && (
            <div>
              <dt>
                <MapPin size={14} /> Ubicación
              </dt>
              <dd>{t?.location ?? r?.location}</dd>
            </div>
          )}
          {t && (
            <div>
              <dt>
                <UserCog size={14} /> Técnico
              </dt>
              <dd>{t.technician ? `${t.technician.name} (${t.technician.team})` : "Por asignar"}</dd>
            </div>
          )}
          <div>
            <dt>
              <Clock size={14} /> Creado
            </dt>
            <dd>
              {new Date(row.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ({timeAgo(row.createdAt)})
            </dd>
          </div>
          {t && (t.status === "en_cola" || t.status === "recibido") && (
            <div>
              <dt>
                <History size={14} /> Tiempo estimado
              </dt>
              <dd className="mrw-info__accent">{t.estimatedResponse ?? "Por calcular"}</dd>
            </div>
          )}
          {t?.priority && (
            <div>
              <dt>
                <CircleAlert size={14} /> Prioridad
              </dt>
              <dd>{PRIORITY_LABEL[t.priority]}</dd>
            </div>
          )}
          {r?.feedback && (
            <div>
              <dt>
                <Star size={14} /> Tu calificación
              </dt>
              <dd>{"★".repeat(r.feedback.rating)}{"☆".repeat(5 - r.feedback.rating)}</dd>
            </div>
          )}
        </dl>

        {lastTech && (
          <>
            <p className="mrw-panel__label">Último mensaje de {lastTech.author}</p>
            <blockquote className="mrw-quote">
              <span className="mrw-quote__avatar">{initials(lastTech.author)}</span>
              <p>“{lastTech.text}”</p>
              <small>Enviado {timeAgo(lastTech.at).toLowerCase()}</small>
            </blockquote>
          </>
        )}
      </div>

      <footer className="mrw-panel__actions">
        <button type="button" className={`mrw-primary ${t?.status === "esperando_respuesta" ? "mrw-primary--pink" : ""}`} onClick={() => onNavigate(primary.to)}>
          {primary.icon} {primary.label}
        </button>
        <button type="button" className="mrw-secondary" onClick={() => downloadReceipt(row)}>
          <FileDown size={16} /> Descargar comprobante (PDF)
        </button>
      </footer>
    </aside>
  );
}
