import { useState } from "react";
import {
  CalendarClock,
  CircleCheck,
  Download,
  FileText,
  History,
  Lock,
  MessageSquareHeart,
  RotateCcw,
  Send,
  Star,
  Timer,
  Wrench,
} from "lucide-react";
import { Button } from "../../components/Button";
import {
  AUTO_CLOSE_BUSINESS_DAYS,
  REOPEN_WINDOW_DAYS,
  formatFileSize,
  type Resolution,
  type Ticket,
} from "../../services/ticketService";

const longDate = (d: Date | string) =>
  new Date(d).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Banner verde "Tu ticket fue resuelto". */
export function ResolvedBanner({ technician }: { technician?: string }) {
  return (
    <section className="resolved-banner" role="status">
      <span className="resolved-banner__icon">
        <CircleCheck size={22} />
      </span>
      <div>
        <h2>Tu ticket fue resuelto</h2>
        <p>
          {technician ? `${technician} marcó` : "El técnico marcó"} esta solicitud como resuelta.
          Revisa la solución y confírmala.
        </p>
      </div>
    </section>
  );
}

/** "Solución aplicada" con el mensaje y archivos del técnico. */
export function SolutionCard({
  resolution,
  onDownload,
}: {
  resolution: Resolution;
  onDownload: (name: string) => void;
}) {
  return (
    <section className="solution" aria-labelledby="solution-title">
      <h2 id="solution-title">
        <Wrench size={18} /> Solución aplicada
      </h2>
      <div className="solution__author">
        <span className="solution__avatar">{initials(resolution.technician)}</span>
        <div>
          <strong>
            {resolution.technician} · Técnico de {resolution.team}
          </strong>
          <small>
            <Timer size={12} /> {longDate(resolution.at)}
          </small>
        </div>
      </div>
      <p className="solution__text">{resolution.text}</p>

      {resolution.attachments.length > 0 && (
        <>
          <p className="solution__files-title">
            Archivos adjuntos del técnico ({resolution.attachments.length})
          </p>
          <ul className="solution__files">
            {resolution.attachments.map((file) => (
              <li key={file.name}>
                <span className="solution__file-icon">
                  <FileText size={18} />
                </span>
                <span className="solution__file-info">
                  <strong>{file.name}</strong>
                  <small>
                    {formatFileSize(file.size)} · {file.type === "application/pdf" ? "Documento PDF" : "Archivo"}
                  </small>
                </span>
                <button type="button" onClick={() => onDownload(file.name)} aria-label={`Descargar ${file.name}`}>
                  <Download size={18} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function AutoCloseNote({ date }: { date: Date }) {
  return (
    <p className="autoclose-note">
      <Timer size={16} />
      <span>
        Si no respondes, se cerrará automáticamente el <strong>{longDate(date)}</strong> (
        {AUTO_CLOSE_BUSINESS_DAYS} días hábiles).
      </span>
    </p>
  );
}

/** Recuadro dentro de la tarjeta de estado cuando el ticket está cerrado. */
export function ClosedSummary({ ticket }: { ticket: Ticket }) {
  if (!ticket.closedAt) return null;
  return (
    <div className="closed-summary">
      <CircleCheck size={16} />
      <p>
        Ticket cerrado el <strong>{longDate(ticket.closedAt)}</strong>
        <br />
        {ticket.closedBy === "automatico"
          ? `Se cerró automáticamente porque no hubo respuesta en ${AUTO_CLOSE_BUSINESS_DAYS} días hábiles.`
          : "Confirmaste que la solución funcionó."}
      </p>
    </div>
  );
}

const RATING_TEXT = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente servicio"];

/** "¿Cómo fue el servicio?" — calificación al técnico después del cierre. */
export function ServiceRating({
  ticket,
  onRate,
}: {
  ticket: Ticket;
  onRate: (rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const shown = hover || rating;
  const done = ticket.serviceRating;

  async function send() {
    setSending(true);
    await onRate(rating, comment);
    setSending(false);
  }

  return (
    <section className="service-rating" aria-labelledby="service-title">
      <h2 id="service-title">
        <MessageSquareHeart size={18} /> ¿Cómo fue el servicio?
      </h2>

      {done ? (
        <div className="service-rating__done" role="status">
          <div className="service-rating__stars service-rating__stars--static" aria-label={`${done.rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((v) => (
              <Star key={v} size={22} className={v <= done.rating ? "is-on" : ""} />
            ))}
          </div>
          <p>¡Gracias por calificar! {done.comment && <em>“{done.comment}”</em>}</p>
        </div>
      ) : (
        <>
          <p className="service-rating__intro">
            Tu opinión ayuda a mejorar los tiempos y la calidad de atención técnica.
          </p>
          <div className="service-rating__box">
            <div
              className="service-rating__stars"
              role="radiogroup"
              aria-label="Calificación del servicio"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={rating === v}
                  aria-label={`${v} de 5: ${RATING_TEXT[v]}`}
                  className={v <= shown ? "is-on" : ""}
                  onClick={() => setRating(v)}
                  onMouseEnter={() => setHover(v)}
                >
                  <Star size={28} />
                </button>
              ))}
            </div>
            <p aria-live="polite">{shown ? RATING_TEXT[shown] : "Toca para calificar"}</p>
          </div>
          <label className="service-rating__label" htmlFor="service-comment">
            Comentario <span className="request__optional">(opcional)</span>
          </label>
          <textarea
            id="service-comment"
            className="sheet-textarea"
            rows={3}
            maxLength={300}
            placeholder="Escribe tu experiencia con el soporte recibido…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            fullWidth
            disabled={rating === 0}
            loading={sending}
            loadingText="Enviando…"
            leadingIcon={<Send size={16} />}
            onClick={send}
          >
            Enviar calificación
          </Button>
        </>
      )}
    </section>
  );
}

/** "¿El problema continúa?" — reabrir dentro del plazo. */
export function ReopenCard({
  deadline,
  available,
  onReopen,
}: {
  deadline: Date | null;
  available: boolean;
  onReopen: () => void;
}) {
  return (
    <section className="reopen-card" aria-labelledby="reopen-title">
      <h2 id="reopen-title">
        <History size={18} /> ¿El problema continúa?
      </h2>
      {available ? (
        <Button variant="outlined" fullWidth leadingIcon={<RotateCcw size={16} />} onClick={onReopen}>
          Reabrir ticket
        </Button>
      ) : (
        <p className="reopen-card__expired">
          <Lock size={14} /> El plazo para reabrir este ticket ya terminó.
        </p>
      )}
      <div className="reopen-card__note">
        <CalendarClock size={16} />
        <p>
          <strong>
            {available && deadline
              ? `Disponible hasta el ${deadline.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`
              : `Se puede reabrir hasta ${REOPEN_WINDOW_DAYS} días naturales después del cierre`}
          </strong>
          <br />
          Después de ese plazo, si el problema regresa, crea una nueva solicitud.
        </p>
      </div>
    </section>
  );
}
