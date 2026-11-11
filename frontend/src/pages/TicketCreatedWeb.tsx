import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Hash,
  House,
  ListChecks,
  RefreshCw,
  Ticket as TicketIcon,
  UserCog,
  Wrench,
} from "lucide-react";

import { Button } from "../components/Button";
import { WebCard, WebShell } from "../components/web/WebShell";
import type { Ticket } from "../services/ticketService";
import "./TicketCreatedWeb.css";

interface Props {
  id: string;
  ticket: Ticket | null;
  summaryRows: ReactNode;
  copied: boolean;
  onCopy: () => void;
}

const NEXT_STEPS = [
  { icon: <Check size={16} strokeWidth={3} />, title: "Ticket recibido", text: "Tu caso ya está registrado.", done: true },
  { icon: <UserCog size={16} />, title: "Revisión del supervisor", text: "Asigna la prioridad y el técnico adecuado." },
  { icon: <Wrench size={16} />, title: "Atención del técnico", text: "Te escribirá aquí si necesita más información." },
  { icon: <ListChecks size={16} />, title: "Solución", text: "Confirmas que quedó resuelto o lo reabres." },
];

/** FR-09 en computadora: confirmación del ticket creado. */
export function TicketCreatedWeb({ id, ticket, summaryRows, copied, onCopy }: Props) {
  const navigate = useNavigate();

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <Link to="/mis-tickets">Mis solicitudes</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Ticket #{id} creado</span>
      </nav>

      <div className="tcw">
        {/* ---------- Principal ---------- */}
        <WebCard className="tcw-main">
          <header className="tcw-hero">
            <div className="outcome__art outcome__art--ticket tcw-hero__art" aria-hidden="true">
              <TicketIcon size={40} />
              <span className="outcome__art-badge outcome__art-badge--ok">
                <Check size={14} strokeWidth={3} />
              </span>
            </div>
            <div>
              <h1>Tu ticket fue creado</h1>
              <div className="outcome__chips tcw-hero__chips">
                <button type="button" className="outcome__chip created__copy" onClick={onCopy}>
                  <Hash size={13} /> {id}
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span className="sr-only">{copied ? "Copiado" : "Copiar número"}</span>
                </button>
                <span className="outcome__chip">
                  <Clock size={13} /> Recibido
                </span>
                {copied && (
                  <span className="created__copied" role="status">
                    Número copiado
                  </span>
                )}
              </div>
              {ticket && <p className="tcw-hero__title">“{ticket.title}”</p>}
            </div>
          </header>

          <section className="summary tcw-summary">
            <header className="summary__head">
              <span className="outcome__info-icon">
                <RefreshCw size={18} />
              </span>
              <div>
                <strong>Información consolidada</strong>
                <p>
                  Enviamos tu descripción, tus respuestas, tu evidencia y las sugerencias que ya
                  intentaste, para que no tengas que repetirlas.
                </p>
              </div>
            </header>
            {summaryRows ?? <div className="home__skeleton" />}
          </section>

          <footer className="tcw-actions">
            <Button variant="outlined" leadingIcon={<House size={18} />} onClick={() => navigate("/inicio")}>
              Ir al inicio
            </Button>
            <Button icon={<ArrowRight size={18} />} onClick={() => navigate(`/tickets/${id}`)}>
              Ver mi ticket
            </Button>
          </footer>
        </WebCard>

        {/* ---------- Lateral ---------- */}
        <aside className="tcw-side">
          <WebCard>
            <h2 className="tcw-side__title">
              <ListChecks size={18} /> ¿Qué sigue?
            </h2>
            <ol className="tcw-steps">
              {NEXT_STEPS.map((step) => (
                <li key={step.title} className={step.done ? "is-done" : ""}>
                  <span className="tcw-steps__icon">{step.icon}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </WebCard>

          <aside className="created__note">
            <UserCog size={18} />
            <p>
              Tu caso entró a la fila de atención. Un <strong>supervisor</strong> lo asignará a un
              técnico especializado que continuará contigo.
            </p>
          </aside>

          <p className="tcw-bell">
            <Bell size={15} /> Te avisaremos en la campana cada vez que tu ticket cambie de estado.
          </p>
        </aside>
      </div>
    </WebShell>
  );
}
