import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Hash,
  House,
  Paperclip,
  RefreshCw,
  Tag,
  Ticket as TicketIcon,
  Timer,
  UserCog,
  Wifi,
} from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { categoryLabel, getTicket, type Ticket } from "../services/ticketService";
import "./TicketCreatedPage.css";

/** FR-09: confirmación del ticket creado con todo el contexto consolidado. */
export function TicketCreatedPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getTicket(id).then((t) => {
      if (!t) navigate("/inicio", { replace: true });
      setTicket(t);
    });
  }, [id, navigate]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* el navegador no permitió copiar; no pasa nada */
    }
  }

  const attachments = ticket?.attachments.length ?? 0;
  const attempted = ticket?.attemptedSteps ?? 0;

  return (
    <div className="screen">
      <AppHeader onBack={() => navigate("/inicio")} />

      <main className="screen__content outcome">
        <div className="outcome__art outcome__art--ticket" aria-hidden="true">
          <TicketIcon size={48} />
          <span className="outcome__art-badge outcome__art-badge--ok">
            <Check size={14} strokeWidth={3} />
          </span>
        </div>

        <h2 className="outcome__title">Tu ticket fue creado</h2>

        <div className="outcome__chips">
          <button type="button" className="outcome__chip created__copy" onClick={copyId}>
            <Hash size={13} /> {id}
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="sr-only">{copied ? "Copiado" : "Copiar número"}</span>
          </button>
          <span className="outcome__chip">
            <Clock size={13} /> Recibido
          </span>
        </div>
        {copied && (
          <p className="created__copied" role="status">
            Número copiado
          </p>
        )}

        <section className="summary">
          <header className="summary__head">
            <span className="outcome__info-icon">
              <RefreshCw size={18} />
            </span>
            <div>
              <strong>Información consolidada</strong>
              <p>
                Enviamos tu descripción, tus respuestas, tu evidencia y las sugerencias que ya
                intentaste.
              </p>
            </div>
          </header>

          {ticket && (
            <dl className="summary__rows">
              <div>
                <dt>
                  {ticket.subcategory === "red" ? <Wifi size={15} /> : <Tag size={15} />} Categoría:
                </dt>
                <dd>
                  <span className="summary__pill">
                    {categoryLabel(ticket.category, ticket.subcategory)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Paperclip size={15} /> Evidencias:
                </dt>
                <dd>{attachments === 0 ? "Sin adjuntos" : `${attachments} adjunto${attachments > 1 ? "s" : ""}`}</dd>
              </div>
              <div>
                <dt>
                  <RefreshCw size={15} /> Autoservicio:
                </dt>
                <dd>
                  {attempted === 0
                    ? "Sin pasos probados"
                    : `${attempted} sugerencia${attempted > 1 ? "s" : ""} probada${attempted > 1 ? "s" : ""}`}
                </dd>
              </div>
              <div>
                <dt>
                  <Timer size={15} /> Respuesta estimada:
                </dt>
                <dd className="summary__estimate">
                  {ticket.estimatedResponse ?? "Por definir"}
                  <small>Tiempo estimado</small>
                </dd>
              </div>
            </dl>
          )}
        </section>

        <aside className="created__note">
          <UserCog size={18} />
          <p>
            Tu caso entró a la fila de atención. Un <strong>supervisor</strong> lo asignará a un
            técnico especializado que continuará contigo.
          </p>
        </aside>
      </main>

      <footer className="screen__footer outcome__footer">
        <Button fullWidth icon={<ArrowRight size={18} />} onClick={() => navigate(`/tickets/${id}`)}>
          Ver mi ticket
        </Button>
        <Button
          variant="outlined"
          fullWidth
          leadingIcon={<House size={18} />}
          onClick={() => navigate("/inicio")}
        >
          Ir al inicio
        </Button>
      </footer>
    </div>
  );
}
