import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Inbox,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Ticket as TicketIcon,
} from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { BottomNav } from "../../components/BottomNav";
import { StatusBadge } from "../../components/StatusBadge";
import {
  categoryLabel,
  getMyRequests,
  getMyTickets,
  timeAgo,
} from "../../services/ticketService";
import { FilterSheet } from "./FilterSheet";
import {
  EMPTY_FILTERS,
  buildItems,
  countFilters,
  matchesFilters,
  type Filters,
  type ListItem,
} from "./listItems";
import { useIsDesktop } from "../../components/useMediaQuery";
import { MyRequestsWeb } from "./MyRequestsWeb";
import "./MyRequestsPage.css";

type Tab = "activas" | "historial";

/** FR-10 / FR-13: solicitudes activas e historial, con filtros. */
function MyRequestsMobile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("vista") === "historial" ? "historial" : "activas";

  const [items, setItems] = useState<ListItem[] | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    Promise.all([getMyTickets(), getMyRequests()]).then(([tickets, requests]) =>
      setItems(buildItems(tickets, requests)),
    );
  }, []);

  const active = useMemo(() => (items ?? []).filter((i) => i.active), [items]);
  const history = useMemo(() => (items ?? []).filter((i) => !i.active), [items]);
  const visible = (tab === "activas" ? active : history).filter((i) => matchesFilters(i, filters));
  const { statusCount, hasDate } = countFilters(filters);
  const hasFilters = statusCount > 0 || hasDate;

  function changeTab(next: Tab) {
    setParams(next === "historial" ? { vista: "historial" } : {}, { replace: true });
  }

  return (
    <div className="screen">
      <AppHeader title="Mis solicitudes" subtitle="Mesa de Ayuda" onBack={() => navigate("/inicio")} />

      <main className="screen__content requests">
        {/* ---------- Pestañas ---------- */}
        <div className="tabs" role="tablist" aria-label="Tipo de solicitudes">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "activas"}
            className={`tabs__tab ${tab === "activas" ? "tabs__tab--on" : ""}`}
            onClick={() => changeTab("activas")}
          >
            Activas
            {active.some((i) => i.needsAction) && <span className="tabs__dot" aria-label="(requiere tu atención)" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "historial"}
            className={`tabs__tab ${tab === "historial" ? "tabs__tab--on" : ""}`}
            onClick={() => changeTab("historial")}
          >
            Historial <span className="tabs__count">{history.length}</span>
          </button>
        </div>

        {/* ---------- Filtros rápidos ---------- */}
        <div className="filters-row">
          <button
            type="button"
            className={`filter-chip ${!hasFilters ? "filter-chip--on" : ""}`}
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Todo
          </button>
          <button
            type="button"
            className={`filter-chip ${statusCount > 0 ? "filter-chip--on" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={14} /> Estado
            {statusCount > 0 && <span className="filter-chip__badge">{statusCount}</span>}
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className={`filter-chip ${hasDate ? "filter-chip--on" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <CalendarDays size={14} /> Fecha
            {hasDate && <span className="filter-chip__dot" />}
            <ChevronDown size={14} />
          </button>
        </div>

        {/* ---------- Lista ---------- */}
        {items === null && (
          <div className="requests__skeletons" aria-label="Cargando solicitudes">
            <div className="home__skeleton" />
            <div className="home__skeleton" />
          </div>
        )}

        {items !== null && visible.length === 0 && (
          <div className="requests__empty">
            <Inbox size={32} />
            {hasFilters ? (
              <>
                <p>Ninguna solicitud coincide con los filtros.</p>
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Limpiar filtros
                </button>
              </>
            ) : tab === "activas" ? (
              <>
                <p>No tienes solicitudes activas.</p>
                <Link to="/nueva-solicitud">
                  <Plus size={14} /> Nueva solicitud
                </Link>
              </>
            ) : (
              <p>Aún no tienes solicitudes en tu historial.</p>
            )}
          </div>
        )}

        <ul className="requests__list" aria-live="polite">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className={`req-card ${item.needsAction ? "req-card--action" : ""}`}
              >
                <div className="req-card__top">
                  <span className="req-card__id">
                    {item.kind === "ticket" ? <TicketIcon size={13} /> : <Sparkles size={13} />} #
                    {item.id}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="req-card__title">{item.title}</p>
                <div className="req-card__meta">
                  <span>{categoryLabel(item.category, item.subcategory)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.kind === "solicitud" ? "Autoservicio" : "Ticket"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{timeAgo(item.date)}</span>
                </div>
                {item.hint && (
                  <p className="req-card__hint">
                    {item.hint} <ChevronRight size={14} />
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {tab === "activas" && items !== null && (
          <p className="requests__legend">
            Los tickets resueltos siguen aquí hasta que confirmes la solución.
          </p>
        )}
      </main>

      <BottomNav />

      <FilterSheet
        open={sheetOpen}
        initial={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

/** Mis solicitudes: tabla en computadora, lista en celular. */
export function MyRequestsPage() {
  return useIsDesktop() ? <MyRequestsWeb /> : <MyRequestsMobile />;
}
