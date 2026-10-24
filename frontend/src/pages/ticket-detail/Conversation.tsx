import { Bot, ClipboardList, Paperclip, ShieldCheck } from "lucide-react";
import type { TicketEvent } from "../../services/ticketService";

function formatEventTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${time}`;
}

function initials(name: string) {
  return name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const ROLE: Record<TicketEvent["kind"], string> = {
  sistema: "Sistema",
  supervisor: "Supervisor",
  tecnico: "Técnico",
  empleado: "Creación del reporte",
};

interface Props {
  events: TicketEvent[];
  userName: string;
  technicianTeam?: string;
}

/** Bitácora del ticket: eventos del sistema y mensajes (FR-16). */
export function Conversation({ events, userName, technicianTeam }: Props) {
  // El primer mensaje del empleado es la descripción con la que creó el reporte.
  const firstMineId = events.find((e) => e.kind === "empleado")?.id;

  return (
    <ol className="conversation">
      {events.map((event) => {
        const mine = event.kind === "empleado";
        const author = mine ? `${userName} (Tú)` : event.author;
        const role =
          event.kind === "tecnico"
            ? `Técnico${technicianTeam ? ` de ${technicianTeam}` : ""}`
            : mine
              ? event.id === firstMineId
                ? ROLE.empleado
                : "Tu mensaje"
              : ROLE[event.kind];

        return (
          <li key={event.id} className={`msg msg--${event.kind}`}>
            <span className="msg__avatar" aria-hidden="true">
              {event.kind === "sistema" ? (
                <ClipboardList size={16} />
              ) : event.kind === "supervisor" ? (
                <ShieldCheck size={16} />
              ) : mine ? (
                initials(userName) || "TÚ"
              ) : event.author.includes("Asistente") ? (
                <Bot size={16} />
              ) : (
                initials(event.author)
              )}
            </span>
            <div className="msg__bubble">
              <div className="msg__head">
                <span>
                  <strong>{author}</strong>
                  <small>{role}</small>
                </span>
                <time dateTime={event.at}>{formatEventTime(event.at)}</time>
              </div>
              <p className="msg__text">{event.text}</p>
              {event.attachments && event.attachments.length > 0 && (
                <ul className="msg__files">
                  {event.attachments.map((name) => (
                    <li key={name}>
                      <Paperclip size={12} /> {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
