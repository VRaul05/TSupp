import { Check } from "lucide-react";
import type { TicketStatus } from "../../services/ticketService";

const STEPS = ["Recibido", "En cola", "En proceso", "Resuelto", "Cerrado"];

const CURRENT_INDEX: Record<TicketStatus, number> = {
  recibido: 0,
  en_cola: 1,
  en_proceso: 2,
  esperando_respuesta: 2,
  resuelto: 3,
  cerrado: 4,
  cancelado: -1,
};

/** Línea de avance: Recibido → En cola → En proceso → Resuelto → Cerrado. */
export function StatusTimeline({ status }: { status: TicketStatus }) {
  const current = CURRENT_INDEX[status];
  const yourTurn = status === "esperando_respuesta";
  const variant = yourTurn
    ? "timeline--your-turn"
    : status === "resuelto"
      ? "timeline--resolved"
      : status === "cerrado"
        ? "timeline--closed"
        : "";

  return (
    <ol className={`timeline ${variant}`}>
      {STEPS.map((label, i) => {
        const done = i < current || (status === "cerrado" && i === current);
        const isCurrent = i === current && status !== "cerrado";
        const state = done ? "done" : isCurrent ? "current" : "todo";
        const text = isCurrent && yourTurn ? "Tu turno" : label;
        return (
          <li
            key={label}
            className={`timeline__step timeline__step--${state}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="timeline__dot">
              {(done || (isCurrent && status === "resuelto")) && <Check size={14} strokeWidth={3} />}
            </span>
            <span className="timeline__label">{text}</span>
          </li>
        );
      })}
    </ol>
  );
}
