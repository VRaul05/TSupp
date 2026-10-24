import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Cpu,
  FileLock2,
  House,
  LogOut,
  Mail,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { Toggle } from "../../components/Toggle";
import { WebShell } from "../../components/web/WebShell";
import { getCurrentUser, logout, resetDemoState } from "../../services/authService";
import { getPreferences, savePreferences, type Preferences } from "../../services/notificationService";
import { getMyTickets, TICKET_STATUS } from "../../services/ticketService";
import { ArcoSheet } from "./ArcoSheet";
import "./ProfileWeb.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Perfil del colaborador en computadora. */
export function ProfileWeb() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [prefs, setPrefs] = useState<Preferences>(getPreferences);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [arcoOpen, setArcoOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyTickets().then((t) => setActiveCount(t.filter((x) => TICKET_STATUS[x.status].open).length));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(id);
  }, [saved]);

  function update(next: Preferences) {
    setPrefs(next);
    savePreferences(next);
    setSaved(true);
  }

  if (!user) return null;

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">Mi perfil</span>
      </nav>

      <div className="pw">
        {/* ---------- Identidad ---------- */}
        <section className="pw-card pw-id">
          <div className="pw-id__avatar">
            <span aria-hidden="true">{initials(user.name)}</span>
            <BadgeCheck size={22} className="pw-id__badge" aria-label="Cuenta verificada" />
          </div>
          <div className="pw-id__info">
            <h1>{user.name}</h1>
            <p className="pw-id__role">
              Colaborador · ID {user.id}
            </p>
            <div className="pw-id__chips">
              <span>
                <MapPin size={13} /> {user.area} · {user.sede ?? "Sede principal"}
              </span>
              <span>
                <Mail size={13} /> {user.email}
              </span>
              <span className="pw-id__ok">
                <ShieldCheck size={13} /> Cuenta institucional verificada
              </span>
            </div>
          </div>
          <Link to="/mis-tickets" className="pw-id__stat">
            <Ticket size={18} />
            <strong>{activeCount ?? "–"}</strong>
            <span>tickets activos</span>
          </Link>
        </section>

        {/* ---------- Preferencias ---------- */}
        <section className="pw-card">
          <header className="pw-card__head">
            <span className="pw-card__icon">
              <Bell size={18} />
            </span>
            <div>
              <h2>Preferencias de notificación</h2>
              <p>Siempre verás los avisos en la campana; aquí eliges qué más quieres recibir.</p>
            </div>
            {saved && (
              <span className="pw-saved" role="status">
                Guardado
              </span>
            )}
          </header>
          <div className="pw-toggles">
            <Toggle
              label="Copia por correo electrónico"
              description="Recibe en tu correo institucional los cambios de estado y las respuestas de los técnicos."
              checked={prefs.emailCopy}
              onChange={(v) => update({ ...prefs, emailCopy: v })}
            />
            <Toggle
              label="Recordatorios de respuesta pendiente"
              description="Te recordamos cuando un técnico espera tu respuesta o un ticket resuelto está por cerrarse automáticamente."
              checked={prefs.reminders}
              onChange={(v) => update({ ...prefs, reminders: v })}
            />
          </div>
        </section>

        {/* ---------- Privacidad ---------- */}
        <section className="pw-card">
          <header className="pw-card__head">
            <span className="pw-card__icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2>Privacidad y protección de datos</h2>
              <p>Tus datos se usan solo para atender tus solicitudes de soporte.</p>
            </div>
          </header>
          <div className="pw-links">
            <Link to="/aviso-privacidad" className="pw-link">
              <span>
                <strong>Aviso de privacidad</strong>
                <small>Consulta qué datos recabamos y cómo funciona el asistente de IA.</small>
              </span>
              <ChevronRight size={18} />
            </Link>
            <button type="button" className="pw-link" onClick={() => setArcoOpen(true)}>
              <span>
                <strong>Derechos ARCO</strong>
                <small>Solicita acceso, rectificación, cancelación u oposición de tus datos.</small>
              </span>
              <FileLock2 size={18} />
            </button>
          </div>
          <p className="pw-ai">
            <Cpu size={14} /> El asistente de IA funciona en la red interna de la institución; tus
            descripciones no se envían a servicios externos.
          </p>
        </section>

        {/* ---------- Sesión ---------- */}
        <footer className="pw-session">
          <div>
            <strong>Sesión iniciada en este navegador</strong>
            <small>Cierra sesión si usas una computadora compartida.</small>
          </div>
          <Button variant="outlined" leadingIcon={<LogOut size={16} />} onClick={() => setLogoutOpen(true)}>
            Cerrar sesión
          </Button>
        </footer>

        <button
          type="button"
          className="profile__reset pw-reset"
          onClick={() => {
            resetDemoState();
            navigate("/login", { replace: true });
          }}
        >
          <RotateCcw size={12} /> Reiniciar datos de demostración
        </button>
      </div>

      <ArcoSheet open={arcoOpen} onClose={() => setArcoOpen(false)} />

      <BottomSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="¿Cerrar sesión?"
        icon={<LogOut size={20} />}
        footer={
          <>
            <Button variant="outlined" onClick={() => setLogoutOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Cerrar sesión
            </Button>
          </>
        }
      >
        <p className="sheet-text">
          Tendrás que volver a ingresar con tu correo institucional para consultar tus tickets.
        </p>
      </BottomSheet>
    </WebShell>
  );
}
