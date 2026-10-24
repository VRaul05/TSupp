import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Asterisk,
  Building2,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Headset,
  Info,
  Clock,
  Lock,
  LockKeyhole,
  LogIn,
  Mail,
  Shield,
  ShieldCheck,
} from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import { BrandMark } from "../components/BrandMark";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { Alert } from "../components/Alert";
import { StatusChip } from "../components/StatusChip";
import { login } from "../services/authService";
import { useIsDesktop } from "../components/useMediaQuery";
import { LoginHero } from "./LoginHero";
import "./LoginPage.css";

const REMEMBER_KEY = "tsupp.rememberedEmail";

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Las 3 variantes del diseño son ESTADOS de esta misma pantalla:
 *  - "idle"   → Iniciar sesión (predeterminada)
 *  - "error"  → Error de credenciales
 *  - "locked" → Cuenta bloqueada
 */
type Status = "idle" | "error" | "locked";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cuenta regresiva mm:ss hasta `target`. */
function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    setNow(Date.now()); // evita mostrar un tiempo mayor a 15:00 al iniciar
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const remainingMs = target ? Math.max(0, target - now) : 0;
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  return {
    finished: remainingMs === 0,
    label: `${minutes}:${seconds.toString().padStart(2, "0")}`,
  };
}

export function LoginPage() {
  const navigate = useNavigate();

  const isDesktop = useIsDesktop();
  const [email, setEmail] = useState(readRemembered);
  const [remember, setRemember] = useState(() => readRemembered() !== "");
  const [attempt, setAttempt] = useState(0); // intento fallido actual (1 a 3)
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [unlockAt, setUnlockAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const countdown = useCountdown(unlockAt);
  const isLocked = status === "locked";

  // Cuando termina el bloqueo, la pantalla regresa al estado normal.
  useEffect(() => {
    if (isLocked && countdown.finished) {
      setStatus("idle");
      setUnlockAt(null);
    }
  }, [isLocked, countdown.finished]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isLocked || loading) return;

    if (!email.trim() || !password) {
      setAttempt(0);
      setStatus("error");
      setErrorMessage("Ingresa tu correo institucional y tu contraseña.");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setAttempt(0);
      setStatus("error");
      setErrorMessage("El correo no tiene un formato válido.");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* sin almacenamiento */
      }
      navigate(result.privacyAccepted ? "/inicio" : "/aviso-privacidad", { replace: true });
      return;
    }

    setPassword("");
    if (result.reason === "locked") {
      setStatus("locked");
      setUnlockAt(result.unlockAt);
    } else {
      setStatus("error");
      setAttempt(3 - result.attemptsLeft);
      setErrorMessage("Credenciales incorrectas. Verifica tus datos e inténtalo de nuevo.");
    }
  }

  // Al escribir de nuevo se limpia el error.
  function clearError() {
    if (status === "error") setStatus("idle");
  }

  const forgotLink = (
    <a className="login__forgot" href="#recuperar">
      ¿Olvidaste tu contraseña?
    </a>
  );

  const submitButton = (
    <Button
      type="submit"
      form="login-form"
      fullWidth
      loading={loading}
      loadingText="Verificando…"
      disabled={isLocked}
      icon={isLocked ? <LogIn size={18} /> : <ArrowRight size={18} />}
    >
      Iniciar sesión
    </Button>
  );

  const ssoBlock = (
    <>
      <div className="login__divider">
        <span>{isDesktop ? "O ingresa con" : "O acceso directo"}</span>
      </div>
      {/* TODO: conectar con el inicio de sesión de red institucional (SSO). */}
      <Button type="button" variant="outlined" fullWidth leadingIcon={<Building2 size={18} />}>
        {isDesktop ? "Inicio de sesión único corporativo (SSO)" : "Acceder con cuenta de red institucional"}
      </Button>
    </>
  );

  const form = (
    <form id="login-form" className="login__form" onSubmit={handleSubmit} noValidate>
      {/* En computadora el error va arriba del formulario, como en el diseño web */}
      {isDesktop && errorAlert()}

      <TextField
        label="Correo institucional"
        type="email"
        inputMode="email"
        autoComplete="username"
        placeholder="nombre.apellido@institucion.edu.mx"
        icon={<Mail size={18} />}
        trailing={isLocked ? <Lock size={16} /> : undefined}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearError();
        }}
        error={status === "error"}
        disabled={isLocked}
      />

      <div className="login__password">
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<LockKeyhole size={18} />}
          labelAction={isLocked ? forgotLink : undefined}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError();
          }}
          error={status === "error"}
          disabled={isLocked}
        />
        {status === "error" && attempt > 0 && (
          <p className="login__field-hint">
            <Info size={13} /> Revisa mayúsculas, minúsculas o caracteres especiales.
          </p>
        )}
      </div>

      {!isLocked &&
        (isDesktop ? (
          <div className="login__options">
            <label className="login__remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Recordar este equipo
            </label>
            {forgotLink}
          </div>
        ) : (
          <div className="login__forgot-row">{forgotLink}</div>
        ))}

      {!isDesktop && errorAlert()}
    </form>
  );

  function errorAlert() {
    if (status === "error") {
      return (
        <Alert tone="error" icon={<CircleAlert size={18} />}>
          <p>
            <strong>{errorMessage}</strong>
          </p>
          {attempt > 0 && (
            <p className="login__attempts">
              Intento {attempt} de 3 antes del bloqueo preventivo de la cuenta.
            </p>
          )}
        </Alert>
      );
    }
    if (isLocked) {
      return (
        <Alert tone="warning" icon={<LockKeyhole size={18} />}>
          <p>Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en 15 minutos.</p>
          <p className="login__countdown">
            <Clock size={14} /> Tiempo restante: <strong>{countdown.label}</strong>
          </p>
        </Alert>
      );
    }
    return null;
  }

  // ---------------- Versión web (computadora) ----------------
  if (isDesktop) {
    return (
      <div className="login-web">
        <LoginHero />

        <section className="login-web__panel">
          <div className="login-web__topbar">
            <CircleHelp size={16} /> ¿Necesitas asistencia técnica?{" "}
            <a href="tel:+520000000000">Contactar soporte</a>
          </div>

          <main className="login-web__form">
            <span className="login-web__chip">
              <ShieldCheck size={13} /> Acceso corporativo
            </span>
            <h2 className="login-web__title">
              {status === "idle" ? "Bienvenido de nuevo" : "Iniciar sesión"}
            </h2>
            <p className="login-web__subtitle">
              Ingresa con tu cuenta corporativa institucional para acceder al portal.
            </p>

            {form}
            <div className="login-web__submit">{submitButton}</div>
            {ssoBlock}

            {status === "idle" ? (
              <p className="login-web__legal">
                Al iniciar sesión aceptas las políticas de uso y el{" "}
                <Link to="/aviso-privacidad?consulta=1">Aviso de Privacidad</Link>.
                <br />
                ¿Necesitas asistencia urgente?{" "}
                <a href="tel:+520000000000">Contacta a la Mesa de Ayuda</a>
              </p>
            ) : (
              <div className="login-web__locked-help">
                <Headset size={18} />
                <p>
                  <strong>¿Cuenta bloqueada?</strong>
                  <br />
                  Contacta a Seguridad Operativa para desbloquearla.
                </p>
                <a href="tel:+520000000000" className="login-web__unlock">
                  Contactar
                </a>
              </div>
            )}
          </main>

          <footer className="login-web__footer">
            <span>© {new Date().getFullYear()} Mesa de Ayuda TI & Mantenimiento</span>
            <nav aria-label="Enlaces legales">
              <Link to="/aviso-privacidad?consulta=1">Aviso de privacidad</Link>
              <a href="tel:+520000000000">Contacto</a>
            </nav>
          </footer>
        </section>
      </div>
    );
  }

  // ---------------- Versión móvil ----------------
  return (
    <div className="screen">
      <AppHeader />

      <main className="screen__content login">
        <section className="login__hero">
          <BrandMark />
          <h2 className="login__title">{isLocked ? "Mesa de Ayuda" : "Bienvenido al soporte"}</h2>
          <p className="login__subtitle">
            Ingresa con tus credenciales institucionales para reportar o consultar incidencias de
            TI y servicios.
          </p>
          {!isLocked && <StatusChip>IA local activa sin conexión</StatusChip>}
        </section>

        {form}

        {isLocked ? (
          <p className="login__hint">
            Si no reconoces estos intentos, contacta a tu supervisor de turno.
          </p>
        ) : (
          ssoBlock
        )}

        {isLocked && (
          <div className="login__ai-card">
            <div>
              <StatusChip>IA en dispositivo</StatusChip>
              <p>Operando sin conexión técnica</p>
            </div>
            <Shield size={18} />
          </div>
        )}
      </main>

      <footer className="screen__footer login__footer">
        {submitButton}

        {isLocked ? (
          <a className="login__hotline" href="tel:+520000000000">
            <span>
              <Asterisk size={14} /> ¿Falla crítica en planta?
            </span>
            <strong>
              Línea directa <ChevronRight size={14} />
            </strong>
          </a>
        ) : (
          <p className="login__footnote">
            <ShieldCheck size={14} /> Asistencia técnica disponible 24/7 con IA local
          </p>
        )}
      </footer>
    </div>
  );
}
