import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Briefcase,
  ChevronRight,
  FileLock2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { BottomNav } from "../../components/BottomNav";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { Toggle } from "../../components/Toggle";
import { getCurrentUser, logout, resetDemoState } from "../../services/authService";
import {
  getPreferences,
  requestPushPermission,
  savePreferences,
  type Preferences,
} from "../../services/notificationService";
import { getMyTickets, TICKET_STATUS } from "../../services/ticketService";
import { ArcoSheet } from "./ArcoSheet";
import { useIsDesktop } from "../../components/useMediaQuery";
import { ProfileWeb } from "./ProfileWeb";
import "./ProfilePage.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function ProfileMobile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(getPreferences);
  const [pushMessage, setPushMessage] = useState("");
  const [askingPush, setAskingPush] = useState(false);
  const [arcoOpen, setArcoOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    getMyTickets().then((tickets) =>
      setActiveCount(tickets.filter((t) => TICKET_STATUS[t.status].open).length),
    );
  }, []);

  function update(next: Preferences) {
    setPrefs(next);
    savePreferences(next);
  }

  async function togglePush(on: boolean) {
    setPushMessage("");
    if (!on) {
      update({ ...prefs, push: false });
      return;
    }
    setAskingPush(true);
    const result = await requestPushPermission();
    setAskingPush(false);
    if (result === "granted") {
      update({ ...prefs, push: true });
    } else {
      setPushMessage(
        result === "unsupported"
          ? "Este navegador no permite notificaciones."
          : "El navegador bloqueó las notificaciones. Actívalas en la configuración del sitio.",
      );
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  return (
    <div className="screen">
      <AppHeader title="Perfil" onBack={() => navigate("/inicio")} />

      <main className="screen__content profile">
        {/* ---------- Tarjeta de usuario ---------- */}
        <section className="profile-card">
          <div className="profile-card__top">
            <span className="profile-card__avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className="profile-card__info">
              <h2>
                {user.name} <BadgeCheck size={18} aria-label="Cuenta verificada" />
              </h2>
              <p>{user.email}</p>
              <span className="profile-card__role">
                <Briefcase size={12} /> Colaborador · {user.area}
              </span>
            </div>
          </div>
          <div className="profile-card__stats">
            <Link to="/mis-tickets" className="profile-stat">
              <strong>{activeCount ?? "–"}</strong>
              <span>Tickets activos</span>
            </Link>
            <div className="profile-stat">
              <strong className="profile-stat__online">
                <span aria-hidden="true" /> En línea
              </strong>
              <span>{user.sede ?? "Sede principal"}</span>
            </div>
          </div>
        </section>

        {/* ---------- Preferencias ---------- */}
        <section>
          <h3 className="profile__section-title">
            <SlidersHorizontal size={16} /> Preferencias de comunicación
          </h3>
          <div className="profile-group">
            <Toggle
              label="Recibir copia por correo"
              description="Te enviaremos los cambios de estado y respuestas de técnicos a tu correo institucional."
              checked={prefs.emailCopy}
              onChange={(v) => update({ ...prefs, emailCopy: v })}
            />
            <Toggle
              label="Notificaciones push"
              description="Avisos inmediatos en este dispositivo cuando tu ticket avance."
              checked={prefs.push}
              onChange={togglePush}
              disabled={askingPush}
            />
            {pushMessage && (
              <p className="profile__warning" role="alert">
                {pushMessage}
              </p>
            )}
          </div>
        </section>

        {/* ---------- Privacidad ---------- */}
        <section>
          <h3 className="profile__section-title">
            <ShieldCheck size={16} /> Privacidad y derechos ARCO
          </h3>
          <div className="profile-group">
            <Link to="/aviso-privacidad" className="profile-link">
              <span>
                <strong>
                  Aviso de privacidad <em>IA local</em>
                </strong>
                <small>Consulta cómo protegemos tus datos y cómo funciona el asistente de IA.</small>
              </span>
              <ChevronRight size={18} />
            </Link>
            <button type="button" className="profile-link" onClick={() => setArcoOpen(true)}>
              <span>
                <strong>Solicitar acceso o corrección de mis datos</strong>
                <small>Ejerce tus derechos de acceso, rectificación, cancelación u oposición.</small>
              </span>
              <FileLock2 size={18} />
            </button>
          </div>
        </section>

        <Button
          variant="outlined"
          fullWidth
          className="profile__logout"
          leadingIcon={<LogOut size={18} />}
          onClick={() => setLogoutOpen(true)}
        >
          Cerrar sesión
        </Button>

        <footer className="profile__footer">
          <p>Mesa de Ayuda · versión de demostración</p>
          <p className="profile__ai">
            <span aria-hidden="true" /> Asistente de IA en la red interna
          </p>
          <button
            type="button"
            className="profile__reset"
            onClick={() => {
              resetDemoState();
              navigate("/login", { replace: true });
            }}
          >
            <RotateCcw size={12} /> Reiniciar datos de demostración
          </button>
        </footer>
      </main>

      <BottomNav />

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
            <Button onClick={handleLogout}>Cerrar sesión</Button>
          </>
        }
      >
        <p className="sheet-text">
          Tendrás que volver a ingresar con tu correo institucional para consultar tus tickets.
        </p>
      </BottomSheet>
    </div>
  );
}

export function ProfilePage() {
  return useIsDesktop() ? <ProfileWeb /> : <ProfileMobile />;
}
