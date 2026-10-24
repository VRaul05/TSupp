import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock,
  ExternalLink,
  House,
  Megaphone,
  MessageSquareReply,
  RefreshCw,
  Reply,
  Settings2,
  Star,
} from "lucide-react";

import { WebShell } from "../../components/web/WebShell";
import {
  getNotifications,
  markAllRead,
  markRead,
  type AppNotification,
  type NotificationType,
} from "../../services/notificationService";
import { timeAgo } from "../../services/ticketService";
import "./NotificationsWeb.css";

type Tab = "todas" | "no_leidas" | "respuestas";
type Period = "7" | "30" | "todo";

const ICONS: Record<NotificationType, React.ReactNode> = {
  estado: <RefreshCw size={20} />,
  respuesta: <MessageSquareReply size={20} />,
  resuelto: <CircleCheck size={20} />,
  aviso_global: <Megaphone size={20} />,
};

const DOMAIN_LABEL = { ti: "TI", edificio: "Instalaciones" } as const;

/** Resalta "#TK-1234" dentro del título. */
function Title({ n }: { n: AppNotification }) {
  if (!n.ticketId || !n.title.includes(`#${n.ticketId}`)) return <>{n.title}</>;
  const [before, after] = n.title.split(`#${n.ticketId}`);
  return (
    <>
      {before}
      <span className="nw-ticket">#{n.ticketId}</span>
      {after}
    </>
  );
}

/** FR-14: Centro de notificaciones en computadora. */
export function NotificationsWeb() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [tab, setTab] = useState<Tab>("todas");
  const [domain, setDomain] = useState<"" | "ti" | "edificio">("");
  const [period, setPeriod] = useState<Period>("30");

  const reload = () => getNotifications().then(setItems);
  useEffect(() => {
    reload();
  }, []);

  const all = items ?? [];
  const counts = {
    todas: all.length,
    no_leidas: all.filter((n) => !n.read).length,
    respuestas: all.filter((n) => n.type === "respuesta").length,
  };

  const visible = useMemo(() => {
    const now = Date.now();
    return all.filter((n) => {
      if (tab === "no_leidas" && n.read) return false;
      if (tab === "respuestas" && n.type !== "respuesta") return false;
      if (domain && n.domain !== domain) return false;
      const age = now - new Date(n.at).getTime();
      if (period === "7" && age > 7 * 864e5) return false;
      if (period === "30" && age > 30 * 864e5) return false;
      return true;
    });
  }, [all, tab, domain, period]);

  function go(n: AppNotification, to?: string) {
    markRead(n.id);
    if (to) navigate(to);
    else reload();
  }

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">Centro de notificaciones</span>
      </nav>

      <header className="nw-head">
        <div>
          <h1>Centro de notificaciones</h1>
          <p>Consulta los cambios de estado y las respuestas de tus tickets de TI e instalaciones.</p>
        </div>
        <div className="nw-head__actions">
          <button
            type="button"
            onClick={() => {
              markAllRead();
              reload();
            }}
            disabled={counts.no_leidas === 0}
          >
            <CheckCheck size={16} /> Marcar todo como leído
          </button>
          <Link to="/perfil">
            <Settings2 size={16} /> Configurar alertas
          </Link>
        </div>
      </header>

      <div className="nw-toolbar">
        <div className="nw-tabs" role="tablist">
          {(
            [
              ["todas", "Todas"],
              ["no_leidas", "No leídas"],
              ["respuestas", "Respuestas de técnicos"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-on" : ""}
              onClick={() => setTab(id)}
            >
              {label} <span>{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className="nw-filters">
          <label className="mrw-select">
            <span>Dominio:</span>
            <select value={domain} onChange={(e) => setDomain(e.target.value as typeof domain)}>
              <option value="">Todos los dominios</option>
              <option value="ti">TI</option>
              <option value="edificio">Instalaciones</option>
            </select>
          </label>
          <label className="mrw-select">
            <CalendarDays size={15} />
            <span className="sr-only">Periodo</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="todo">Todo el historial</option>
            </select>
          </label>
        </div>
      </div>

      {items === null && <div className="home__skeleton" />}

      {items !== null && visible.length === 0 && (
        <div className="nw-empty">
          <Bell size={32} />
          <p>{tab === "no_leidas" ? "¡Estás al día! No tienes notificaciones sin leer." : "No hay notificaciones con estos filtros."}</p>
        </div>
      )}

      <ul className="nw-list">
        {visible.map((n) => (
          <li key={n.id} className={`nw-item ${n.read ? "" : "nw-item--unread"}`}>
            <span className={`nw-item__icon nw-item__icon--${n.type}`}>{ICONS[n.type]}</span>
            <div className="nw-item__body">
              <div className="nw-item__title">
                {!n.read && <span className="nw-dot" aria-label="Sin leer" />}
                <strong>
                  <Title n={n} />
                </strong>
                <span className={`notif__tag notif__tag--${n.type}`}>{n.tag}</span>
                {n.domain && !n.tag.startsWith(DOMAIN_LABEL[n.domain]) && <span className="nw-domain">{DOMAIN_LABEL[n.domain]}</span>}
              </div>
              {n.quote ? <q className="nw-quote">{n.quote}</q> : <p>{n.body}</p>}
              <div className="nw-item__meta">
                <span>
                  <Clock size={13} /> {timeAgo(n.at)}
                </span>
                {n.type === "respuesta" && <span className="nw-item__need">Respuesta requerida</span>}
                {n.quote && <span>{n.body}</span>}
              </div>
            </div>

            <div className="nw-item__actions">
              {n.type === "respuesta" && n.ticketId && (
                <button type="button" className="nw-btn nw-btn--pink" onClick={() => go(n, `/tickets/${n.ticketId}`)}>
                  <Reply size={15} /> Responder
                </button>
              )}
              {n.type === "resuelto" && n.ticketId && (
                <button type="button" className="nw-btn nw-btn--soft" onClick={() => go(n, `/tickets/${n.ticketId}`)}>
                  Revisar y calificar <Star size={14} />
                </button>
              )}
              {n.ticketId && n.type !== "resuelto" && (
                <button type="button" className="nw-btn" onClick={() => go(n, `/tickets/${n.ticketId}`)}>
                  Ver ticket <ExternalLink size={14} />
                </button>
              )}
              {!n.ticketId && !n.read && (
                <button type="button" className="nw-btn" onClick={() => go(n)}>
                  Marcar como leída
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <aside className="nw-info">
        <Bell size={16} />
        <p>
          <strong>¿Cuándo te avisamos?</strong> Cada vez que uno de tus tickets cambia de estado o
          un técnico te responde. Puedes elegir recibir una copia por correo desde tu perfil.
        </p>
      </aside>
    </WebShell>
  );
}
