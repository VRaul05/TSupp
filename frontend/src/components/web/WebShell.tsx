import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Headset, LogOut, Plus, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser, logout } from "../../services/authService";
import {
  getNotifications,
  markAllRead,
  markRead,
  type AppNotification,
} from "../../services/notificationService";
import { timeAgo } from "../../services/ticketService";
import { useUnreadCount } from "../useUnreadCount";
import "./WebShell.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Cierra un menú flotante al hacer clic fuera o presionar Escape. */
function useDismiss(open: boolean, setOpen: (v: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open, setOpen]);
  return ref;
}

/** Campana con las últimas notificaciones (FR-14). */
function BellMenu() {
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useDismiss(open, setOpen);

  useEffect(() => {
    if (open) getNotifications().then((list) => setItems(list.slice(0, 4)));
  }, [open, unread]);

  return (
    <div className="bell-menu" ref={ref}>
      <button
        type="button"
        className="web-nav__bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} />
        {unread > 0 && <span className="web-nav__dot" />}
      </button>
      {open && (
        <div className="bell-menu__panel" role="dialog" aria-label="Notificaciones recientes">
          <div className="bell-menu__head">
            <strong>
              Notificaciones {unread > 0 && <span>{unread} nuevas</span>}
            </strong>
            <button type="button" onClick={markAllRead} disabled={unread === 0}>
              Marcar todo como leído
            </button>
          </div>
          <ul>
            {items === null && <li className="bell-menu__empty">Cargando…</li>}
            {items?.length === 0 && <li className="bell-menu__empty">No tienes notificaciones.</li>}
            {items?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={n.read ? "" : "is-unread"}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    navigate(n.ticketId ? `/tickets/${n.ticketId}` : "/notificaciones");
                  }}
                >
                  <span className="bell-menu__dot" aria-hidden="true" />
                  <span>
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                    <em>{timeAgo(n.at)}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notificaciones" className="bell-menu__all" onClick={() => setOpen(false)}>
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}

/** Menú del usuario (arriba a la derecha). */
function UserMenu() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);

  if (!user) return null;

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar">{initials(user.name)}</span>
        <span className="user-menu__text">
          <strong>{user.name}</strong>
          <small>Colaborador · {user.area}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="user-menu__list" role="menu">
          <Link to="/perfil" role="menuitem" onClick={() => setOpen(false)}>
            <UserRound size={16} /> Mi perfil
          </Link>
          <Link to="/aviso-privacidad" role="menuitem" onClick={() => setOpen(false)}>
            <ShieldCheck size={16} /> Aviso de privacidad
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Estructura de las pantallas en computadora:
 * barra superior + contenido centrado + pie de página.
 */
export function WebShell({ children }: { children: ReactNode }) {
  return (
    <div className="web">
      <header className="web-nav">
        <div className="web-nav__inner">
          <Link to="/inicio" className="web-nav__brand">
            <span className="web-nav__logo">
              <Headset size={18} />
            </span>
            Mesa de Ayuda
          </Link>
          <nav className="web-nav__links" aria-label="Principal">
            <NavLink to="/inicio">Inicio</NavLink>
            <NavLink to="/mis-tickets">Mis solicitudes</NavLink>
          </nav>

          <div className="web-nav__actions">
            <Link to="/nueva-solicitud" className="web-nav__new">
              <Plus size={18} /> Nueva solicitud
            </Link>
            <BellMenu />
            <span className="web-nav__divider" aria-hidden="true" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="web__main">{children}</main>

      <footer className="web-footer">
        <div className="web-footer__inner">
          <span>
            <ShieldCheck size={14} /> © {new Date().getFullYear()} Mesa de Ayuda TI & Mantenimiento.
            Asistencia con IA local.
          </span>
          <nav aria-label="Enlaces del pie">
            <Link to="/aviso-privacidad">Aviso de privacidad</Link>
            <a href="tel:+520000000000">Centro de soporte</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Tarjeta blanca estándar de la versión web. */
export function WebCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`web-card ${className}`}>{children}</section>;
}
