import { useRef, useState, type UIEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, Lock, ShieldCheck } from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { StatusChip } from "../components/StatusChip";
import { acceptPrivacyNotice, getCurrentUser, hasAcceptedPrivacy } from "../services/authService";
import { useIsDesktop } from "../components/useMediaQuery";
import { NOTICE_VERSION, SECTIONS } from "./privacyNotice";
import { PrivacyNoticeWeb } from "./PrivacyNoticeWeb";
import "./PrivacyNoticePage.css";

export function PrivacyNoticePage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Si ya lo aceptó (se abre desde Perfil), solo se consulta.
  const [params] = useSearchParams();
  const [consult] = useState(
    () => params.get("consulta") === "1" || (hasAcceptedPrivacy() && getCurrentUser() !== null),
  );

  const [readToEnd, setReadToEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Se habilita la casilla solo cuando la persona llegó al final del texto.
  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 1 : el.scrollTop / max;
    setProgress(pct);
    if (pct > 0.97) setReadToEnd(true);
  }

  function scrollDown() {
    scrollRef.current?.scrollBy({ top: 160, behavior: "smooth" });
  }

  async function handleContinue() {
    setSaving(true);
    await acceptPrivacyNotice();
    navigate("/inicio", { replace: true });
  }

  // En computadora, con sesión iniciada y aviso aceptado → versión de consulta web.
  if (isDesktop && consult && getCurrentUser()) return <PrivacyNoticeWeb />;

  return (
    <div className={`screen ${isDesktop ? "screen--wide" : ""}`}>
      <AppHeader onBack={() => (consult ? navigate(-1) : navigate("/login"))} />

      <main className="screen__content privacy">
        <div className="privacy__chips">
          <StatusChip tone="tertiary" icon={<ShieldCheck size={12} />}>
            Protección de datos & IA local
          </StatusChip>
          {!consult && (
            <StatusChip tone="neutral" icon={null}>
              Paso 1 de 1
            </StatusChip>
          )}
        </div>

        <div>
          <h2 className="privacy__title">Aviso de privacidad</h2>
          <p className="privacy__intro">
            {consult
              ? "Consulta cómo protegemos tus datos y cómo funciona el asistente de IA local."
              : "Bienvenido a tu primer inicio de sesión. Por favor, lee las condiciones de resguardo técnico y confidencialidad."}
          </p>
        </div>

        <section className="privacy__box" aria-label="Texto del aviso de privacidad">
          <div className="privacy__box-head">
            <span>
              <ShieldCheck size={14} /> Normativa • {NOTICE_VERSION}
            </span>
            {!readToEnd && (
              <button type="button" className="privacy__scroll-btn" onClick={scrollDown}>
                Desplazar <ArrowDown size={12} />
              </button>
            )}
          </div>
          <div className="privacy__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>

          <div className="privacy__text" ref={scrollRef} onScroll={handleScroll} tabIndex={0}>
            {SECTIONS.map((section, i) => (
              <article key={section.title}>
                <h3>
                  {i + 1}. {section.title}
                </h3>
                <p>{section.body}</p>
              </article>
            ))}
            <p className="privacy__end">
              <Lock size={12} /> Privacidad por diseño
            </p>
          </div>
        </section>

        {consult ? (
          hasAcceptedPrivacy() && (
          <p className="privacy__accepted">
            <Check size={16} strokeWidth={3} /> Ya aceptaste este aviso de privacidad.
          </p>
          )
        ) : (
        <label className={`privacy__check ${!readToEnd ? "privacy__check--disabled" : ""}`}>
          <input
            type="checkbox"
            className="sr-only"
            checked={accepted}
            disabled={!readToEnd}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span className="privacy__box-mark" aria-hidden="true">
            {accepted && <Check size={14} strokeWidth={3} />}
          </span>
          <span>
            He leído el aviso de privacidad
            {!readToEnd && <small>Desplázate hasta el final del texto para habilitar esta opción.</small>}
          </span>
        </label>
        )}
      </main>

      <footer className="screen__footer privacy__footer">
        {consult ? (
          <Button fullWidth variant="outlined" onClick={() => navigate(-1)}>
            Volver
          </Button>
        ) : (
        <Button
          fullWidth
          disabled={!accepted}
          loading={saving}
          loadingText="Guardando…"
          onClick={handleContinue}
          icon={<ArrowRight size={18} />}
        >
          Continuar
        </Button>
        )}
        <p>Acceso autenticado y seguro al sistema</p>
      </footer>
    </div>
  );
}
