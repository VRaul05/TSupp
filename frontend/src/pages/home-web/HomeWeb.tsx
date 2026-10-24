import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Headset,
  History,
  ListOrdered,
  Monitor,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

import { WebShell, WebCard } from "../../components/web/WebShell";
import { StatusBadge } from "../../components/StatusBadge";
import { subcategoryIcon } from "../../components/subcategoryIcons";
import { getCurrentUser } from "../../services/authService";
import { getNotifications, type AppNotification } from "../../services/notificationService";
import {
  getMyTickets,
  timeAgo,
  TICKET_STATUS,
  type CategoryId,
  type Ticket,
} from "../../services/ticketService";
import "./HomeWeb.css";

const TI_LINKS = [
  { sub: "red", label: "Red / Wi-Fi corporativo" },
  { sub: "cuenta", label: "Cuentas y contraseñas" },
  { sub: "computadora", label: "Equipo de cómputo y periféricos" },
  { sub: "software", label: "Software y licencias" },
  { sub: "vpn", label: "VPN y acceso remoto" },
];

const BUILDING_LINKS = [
  { sub: "climatizacion", label: "Climatización y aire acondicionado" },
  { sub: "iluminacion", label: "Electricidad e iluminación" },
  { sub: "mobiliario", label: "Mobiliario y ergonomía" },
  { sub: "cerraduras", label: "Accesos físicos y cerraduras" },
  { sub: "limpieza", label: "Limpieza y mantenimiento general" },
];

const COMMON = [
  { label: "VPN", category: "ti", sub: "vpn" },
  { label: "Contraseña", category: "ti", sub: "cuenta" },
  { label: "Impresora", category: "ti", sub: "impresora" },
  { label: "Silla ergonómica", category: "edificio", sub: "mobiliario" },
];

const URGENT: Ticket["status"][] = ["esperando_respuesta", "resuelto"];
const byUrgency = (a: Ticket, b: Ticket) =>
  (URGENT.includes(a.status) ? 0 : 1) - (URGENT.includes(b.status) ? 0 : 1) ||
  b.updatedAt.localeCompare(a.updatedAt);

const newRequestUrl = (category: string, sub?: string) =>
  `/nueva-solicitud?categoria=${category}${sub ? `&sub=${sub}` : ""}`;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function HomeWeb() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const firstName = user?.name.split(" ")[0] ?? "";

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [activity, setActivity] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchCategory, setSearchCategory] = useState<CategoryId | "">("");

  useEffect(() => {
    getMyTickets().then(setTickets);
    getNotifications().then((list) => setActivity(list.slice(0, 3)));
  }, []);

  const active = (tickets ?? []).filter((t) => TICKET_STATUS[t.status].open).sort(byUrgency);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(searchCategory ? newRequestUrl(searchCategory) : "/nueva-solicitud", {
      state: { description: query.trim() },
    });
  }

  return (
    <WebShell>
      <div className="hw">
        {/* ---------- Saludo y búsqueda ---------- */}
        <WebCard className="hw-hero">
          <span className="hw-chip">
            <Headset size={14} /> Mesa de Ayuda activa
          </span>
          <h1>Hola, {firstName}</h1>
          <p>Estamos aquí para ayudarte a resolver cualquier problema técnico o de instalaciones.</p>

          <form className="hw-search" onSubmit={handleSearch} role="search">
            <Search size={18} />
            <label htmlFor="hw-search" className="sr-only">
              ¿Qué problema tienes?
            </label>
            <input
              id="hw-search"
              type="search"
              placeholder="¿Qué problema tienes? (ej. Wi-Fi, monitor, aire acondicionado)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={`hw-search__filters ${searchCategory ? "is-on" : ""}`}
              aria-expanded={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal size={16} /> Filtros
            </button>
            <button type="submit" className="hw-search__go" aria-label="Buscar" disabled={!query.trim()}>
              <ArrowRight size={18} />
            </button>
          </form>

          {showFilters && (
            <div className="hw-filters" role="radiogroup" aria-label="Categoría de la búsqueda">
              <span>Buscar en:</span>
              {[
                { id: "", label: "Todas las categorías" },
                { id: "ti", label: "Tecnología / TI" },
                { id: "edificio", label: "Edificio / Instalaciones" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={searchCategory === option.id}
                  className={searchCategory === option.id ? "is-on" : ""}
                  onClick={() => setSearchCategory(option.id as CategoryId | "")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <div className="hw-common">
            <span>Búsquedas comunes:</span>
            {COMMON.map((item) => (
              <Link key={item.label} to={newRequestUrl(item.category, item.sub)}>
                {subcategoryIcon(item.sub, 14)} {item.label}
              </Link>
            ))}
          </div>
        </WebCard>

        {/* ---------- Categorías ---------- */}
        <div className="hw-categories">
          {[
            {
              id: "ti",
              title: "Tecnología / TI",
              text: "Sistemas, conectividad de red, equipo de cómputo y accesos corporativos.",
              tag: "Soporte digital",
              icon: <Monitor size={24} />,
              tagIcon: <Monitor size={12} />,
              links: TI_LINKS,
              cta: "Iniciar ticket de TI",
            },
            {
              id: "edificio",
              title: "Edificio / Instalaciones",
              text: "Mantenimiento físico, comodidad de los espacios de trabajo y servicios generales.",
              tag: "Infraestructura",
              icon: <Wrench size={24} />,
              tagIcon: <Building2 size={12} />,
              links: BUILDING_LINKS,
              cta: "Iniciar ticket de instalaciones",
            },
          ].map((cat) => (
            <WebCard key={cat.id} className="hw-cat">
              <div className="hw-cat__top">
                <span className="hw-cat__icon">{cat.icon}</span>
                <span className="hw-cat__tag">
                  {cat.tagIcon} {cat.tag}
                </span>
              </div>
              <h2>{cat.title}</h2>
              <p>{cat.text}</p>
              <ul>
                {cat.links.map((link) => (
                  <li key={link.sub}>
                    <Link to={newRequestUrl(cat.id, link.sub)}>
                      <span className="hw-cat__sub-icon">{subcategoryIcon(link.sub, 16)}</span>
                      {link.label}
                      <ArrowRight size={16} className="hw-cat__arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to={newRequestUrl(cat.id)} className="hw-cat__cta">
                {cat.cta} <ChevronRight size={14} />
              </Link>
            </WebCard>
          ))}
        </div>

        {/* ---------- Tickets + actividad ---------- */}
        <div className="hw-bottom">
          <section className="hw-tickets" aria-labelledby="hw-tickets-title">
            <div className="hw-section-head">
              <h2 id="hw-tickets-title">
                Mis tickets activos <span className="hw-count">{active.length}</span>
              </h2>
              <Link to="/mis-tickets">
                Ver todas las solicitudes <ArrowRight size={16} />
              </Link>
            </div>

            {tickets === null && <div className="home__skeleton" />}
            {tickets !== null && active.length === 0 && (
              <WebCard className="hw-empty">
                <CircleCheck size={28} />
                <p>No tienes tickets activos. ¡Todo en orden!</p>
              </WebCard>
            )}

            <ul className="hw-ticket-list">
              {active.slice(0, 4).map((t) => (
                <li key={t.id} className={`hw-ticket ${t.status === "esperando_respuesta" ? "hw-ticket--action" : ""}`}>
                  <div className="hw-ticket__top">
                    <span className="hw-ticket__icon">{subcategoryIcon(t.subcategory, 18)}</span>
                    <div className="hw-ticket__title">
                      <code>#{t.id}</code>
                      <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="hw-ticket__meta">
                    {t.status === "esperando_respuesta" ? (
                      <>
                        <span className="hw-ticket__alert">
                          <CircleAlert size={15} /> {t.pendingAction ?? "El técnico necesita tu respuesta"}
                        </span>
                        <Link to={`/tickets/${t.id}`} className="hw-ticket__respond">
                          Responder
                        </Link>
                      </>
                    ) : t.status === "resuelto" ? (
                      <>
                        <span className="hw-ticket__ok">
                          <CircleCheck size={15} /> El técnico lo marcó como resuelto. Confírmalo.
                        </span>
                        <Link to={`/tickets/${t.id}`}>Revisar</Link>
                      </>
                    ) : t.status === "en_cola" || t.status === "recibido" ? (
                      <>
                        <span>
                          <ListOrdered size={15} /> Posición estimada: <strong>{t.queuePosition ?? "—"}</strong>
                          <span className="hw-sep" />
                          <Clock size={15} /> Tiempo de atención: <strong>{t.estimatedResponse ?? "Por calcular"}</strong>
                        </span>
                        <Link to={`/tickets/${t.id}`}>Ver detalles</Link>
                      </>
                    ) : (
                      <>
                        <span>
                          <span className="hw-avatar">{initials(t.technician?.name ?? "?")}</span>
                          Técnico asignado: <strong>{t.technician?.name ?? "Por asignar"}</strong>
                          {t.technician && ` (${t.technician.team})`}
                        </span>
                        <Link to={`/tickets/${t.id}`}>Ver detalles</Link>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="hw-side">
            <WebCard className="hw-activity">
              <div className="hw-activity__head">
                <h2>Actividad reciente</h2>
                <Link to="/notificaciones" aria-label="Ver todas las notificaciones">
                  <History size={18} />
                </Link>
              </div>
              <ol>
                {activity.map((n) => (
                  <li key={n.id} className={`hw-activity__item hw-activity__item--${n.type}`}>
                    <span className="hw-activity__dot" />
                    <small>{timeAgo(n.at)}</small>
                    <Link to={n.ticketId ? `/tickets/${n.ticketId}` : "/notificaciones"}>{n.title}</Link>
                    {n.quote && <q>{n.quote}</q>}
                  </li>
                ))}
              </ol>
            </WebCard>

            <WebCard className="hw-ai">
              <div className="hw-ai__head">
                <span className="hw-ai__icon">
                  <Bot size={20} />
                </span>
                <div>
                  <strong>
                    Asistente IA local <em>Activo</em>
                  </strong>
                  <small>Sin conexión externa</small>
                </div>
              </div>
              <p>
                Tus datos se procesan en la red privada de la institución. El asistente solo sugiere
                pasos; la decisión siempre es tuya.
              </p>
              <Link to="/nueva-solicitud" className="hw-ai__cta">
                <MessageSquareText size={16} /> Consultar diagnóstico rápido
              </Link>
            </WebCard>
          </aside>
        </div>
      </div>
    </WebShell>
  );
}
