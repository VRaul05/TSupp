import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, FileLock2, House, Lock, Printer, ShieldCheck } from "lucide-react";

import { Button } from "../components/Button";
import { WebCard, WebShell } from "../components/web/WebShell";
import { hasAcceptedPrivacy } from "../services/authService";
import { ArcoSheet } from "./profile/ArcoSheet";
import { NOTICE_VERSION, SECTIONS } from "./privacyNotice";
import "./PrivacyNoticeWeb.css";

/** Aviso de privacidad en modo consulta (computadora). */
export function PrivacyNoticeWeb() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [arcoOpen, setArcoOpen] = useState(false);
  const lockUntil = useRef(0); // evita que el índice "salte" mientras se desplaza tras un clic

  // Resalta en el índice la sección que se está leyendo.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(Number((visible[0].target as HTMLElement).dataset.index));
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    document.querySelectorAll(".pnw-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function goTo(index: number) {
    setActive(index);
    lockUntil.current = Date.now() + 1000;
    document.getElementById(`aviso-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">Aviso de privacidad</span>
      </nav>

      <header className="pnw-head">
        <div>
          <span className="pnw-chip">
            <ShieldCheck size={13} /> Protección de datos & IA local
          </span>
          <h1>Aviso de privacidad</h1>
          <p>Consulta cómo protegemos tus datos y cómo funciona el asistente de IA local.</p>
        </div>
        <div className="pnw-head__actions">
          <Button variant="outlined" leadingIcon={<Printer size={16} />} onClick={() => window.print()}>
            Imprimir
          </Button>
          <Button variant="outlined" leadingIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </header>

      <div className="pnw">
        {/* ---------- Índice ---------- */}
        <aside className="pnw-side">
          <WebCard className="pnw-toc">
            <h2>Contenido</h2>
            <ol>
              {SECTIONS.map((section, i) => (
                <li key={section.title}>
                  <button
                    type="button"
                    className={active === i ? "is-active" : ""}
                    aria-current={active === i ? "true" : undefined}
                    onClick={() => goTo(i)}
                  >
                    <span>{i + 1}</span> {section.title}
                  </button>
                </li>
              ))}
            </ol>
          </WebCard>

          {hasAcceptedPrivacy() && (
            <p className="privacy__accepted pnw-accepted">
              <Check size={16} strokeWidth={3} /> Ya aceptaste este aviso de privacidad.
            </p>
          )}

          <WebCard className="pnw-arco">
            <h2>
              <FileLock2 size={16} /> Derechos ARCO
            </h2>
            <p>Solicita acceso, rectificación, cancelación u oposición de tus datos personales.</p>
            <button type="button" onClick={() => setArcoOpen(true)}>
              Hacer una solicitud
            </button>
          </WebCard>
        </aside>

        {/* ---------- Documento ---------- */}
        <WebCard className="pnw-doc">
          <div className="pnw-doc__meta">
            <span>
              <ShieldCheck size={14} /> Normativa • {NOTICE_VERSION}
            </span>
            <span>Acceso autenticado y seguro al sistema</span>
          </div>
          {SECTIONS.map((section, i) => (
            <section
              key={section.title}
              id={`aviso-${i + 1}`}
              data-index={i}
              className="pnw-section"
            >
              <h2>
                <span>{i + 1}</span> {section.title}
              </h2>
              <p>{section.body}</p>
            </section>
          ))}
          <p className="pnw-doc__end">
            <Lock size={13} /> Privacidad por diseño
          </p>
        </WebCard>
      </div>

      <ArcoSheet open={arcoOpen} onClose={() => setArcoOpen(false)} />
    </WebShell>
  );
}
