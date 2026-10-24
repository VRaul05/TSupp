import { NavLink } from "react-router-dom";
import { Bell, House, Ticket, UserRound } from "lucide-react";
import { useUnreadCount } from "./useUnreadCount";
import "./BottomNav.css";

const ITEMS = [
  { to: "/inicio", label: "Inicio", icon: House },
  { to: "/mis-tickets", label: "Mis solicitudes", icon: Ticket },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell, badge: true },
  { to: "/perfil", label: "Perfil", icon: UserRound },
];

/** Navegación inferior del portal del empleado. */
export function BottomNav() {
  const unread = useUnreadCount();

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {ITEMS.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to} className="bottom-nav__item">
          <span className="bottom-nav__icon">
            <Icon size={20} />
            {badge && unread > 0 && (
              <span className="bottom-nav__badge" aria-label={`${unread} sin leer`} />
            )}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
