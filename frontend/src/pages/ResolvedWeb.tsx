import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheckBig,
  FileText,
  Hash,
  House,
  PlusCircle,
  Send,
  ShieldCheck,
  Tag,
  Ticket,
} from "lucide-react";

import { Button } from "../components/Button";
import { WebCard, WebShell } from "../components/web/WebShell";
import { CATEGORIES, categoryLabel, type SupportRequest } from "../services/ticketService";
import "./ResolvedWeb.css";

interface Props {
  request: SupportRequest | null;
  ratingBlock: ReactNode;
  sent: boolean;
  rating: number;
  sending: boolean;
  onSend: () => void;
}

function longDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** FR-08 en computadora: resolución por autoservicio + calificación opcional. */
export function ResolvedWeb({ request, ratingBlock, sent, rating, sending, onSend }: Props) {
  const navigate = useNavigate();
  const domain = request ? CATEGORIES.find((c) => c.id === request.category)?.title : "";

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <Link to="/mis-tickets">Mis solicitudes</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Solicitud {request?.id ?? ""} resuelta</span>
      </nav>

      <div className="rsw">
        {/* ---------- Columna principal ---------- */}
        <WebCard className="rsw-main">
          <header className="rsw-hero">
            <div className="rsw-hero__art" aria-hidden="true">
              <CircleCheckBig size={44} />
            </div>
            <div>
              <span className="resolved__badge">
                <Check size={13} strokeWidth={3} /> Resuelto por autoservicio
              </span>
              <h1>¡Qué bueno que se resolvió!</h1>
              <p>
                Tu solicitud se marcó como resuelta con las sugerencias del asistente. No fue
                necesario crear un ticket.
              </p>
            </div>
          </header>

          <div className="rsw-rating">{ratingBlock}</div>

          <footer className="rsw-actions">
            {sent ? (
              <Button onClick={() => navigate("/inicio")}>Ir al inicio</Button>
            ) : (
              <>
                <button type="button" className="outcome__link" onClick={() => navigate("/inicio")}>
                  Omitir y volver al inicio
                </button>
                <Button
                  disabled={rating === 0}
                  loading={sending}
                  loadingText="Enviando…"
                  leadingIcon={<Send size={18} />}
                  onClick={onSend}
                >
                  Enviar calificación
                </Button>
              </>
            )}
          </footer>
        </WebCard>

        {/* ---------- Columna lateral ---------- */}
        <aside className="rsw-side">
          <WebCard>
            <h2 className="rsw-side__title">
              <FileText size={18} /> Resumen de tu solicitud
            </h2>
            {request ? (
              <dl className="rsw-summary">
                <div>
                  <dt>
                    <Hash size={14} /> Folio
                  </dt>
                  <dd>{request.id}</dd>
                </div>
                <div>
                  <dt>
                    <Tag size={14} /> Categoría
                  </dt>
                  <dd>
                    {domain}
                    {request.subcategory ? ` · ${categoryLabel(request.category, request.subcategory)}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>
                    <CalendarDays size={14} /> Enviada
                  </dt>
                  <dd>{longDate(request.createdAt)}</dd>
                </div>
                <div>
                  <dt>
                    <Check size={14} /> Resuelta
                  </dt>
                  <dd>{longDate(request.resolvedAt ?? request.createdAt)}</dd>
                </div>
                <div className="rsw-summary__full">
                  <dt>Título</dt>
                  <dd className="rsw-summary__titletext">{request.title}</dd>
                </div>
              </dl>
            ) : (
              <div className="home__skeleton" />
            )}
          </WebCard>

          <WebCard className="rsw-again">
            <h2 className="rsw-side__title">
              <Ticket size={18} /> ¿Volvió a fallar?
            </h2>
            <p>
              Si el problema regresa, crea una nueva solicitud. Si el asistente no encuentra una
              solución, podrás convertirla en ticket para que te atienda un técnico.
            </p>
            <Link to="/nueva-solicitud" className="rsw-again__link">
              <PlusCircle size={16} /> Crear nueva solicitud
            </Link>
          </WebCard>

          <aside className="resolved__note">
            <span>
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong>
                Mejora continua y local <em>Red interna</em>
              </strong>
              <p>
                Tu calificación se guarda en la red de la institución. El equipo técnico la revisa
                para mejorar las guías; nada se publica de forma automática.
              </p>
            </div>
          </aside>
        </aside>
      </div>
    </WebShell>
  );
}
