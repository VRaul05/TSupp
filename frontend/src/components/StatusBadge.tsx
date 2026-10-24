import {
  Ban,
  CircleCheck,
  CircleDot,
  Clock,
  Inbox,
  Lock,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
  Ticket,
  Undo2,
} from "lucide-react";
import type { TicketStatus } from "../services/ticketService";
import "./StatusBadge.css";

/** Estados de las solicitudes de autoservicio, como los ve el empleado. */
export type RequestDisplayStatus = "abierta" | "resuelta" | "convertida" | "abandonada";

export type AnyStatus = TicketStatus | RequestDisplayStatus;

export const STATUS_META: Record<AnyStatus, { label: string; icon: React.ReactNode }> = {
  recibido: { label: "Recibido", icon: <Inbox size={12} /> },
  en_cola: { label: "En cola", icon: <Clock size={12} /> },
  en_proceso: { label: "En proceso", icon: <RefreshCw size={12} /> },
  esperando_respuesta: { label: "Esperando tu respuesta", icon: <MessageCircleQuestion size={12} /> },
  resuelto: { label: "Resuelto", icon: <CircleCheck size={12} /> },
  cerrado: { label: "Cerrado", icon: <Lock size={12} /> },
  cancelado: { label: "Cancelado", icon: <Ban size={12} /> },
  abierta: { label: "Abierta", icon: <Sparkles size={12} /> },
  resuelta: { label: "Resuelta", icon: <CircleCheck size={12} /> },
  convertida: { label: "Convertida en ticket", icon: <Ticket size={12} /> },
  abandonada: { label: "Abandonada", icon: <Undo2 size={12} /> },
};

/** Pastilla de color con el estado de un ticket o solicitud. */
export function StatusBadge({ status }: { status: AnyStatus }) {
  const meta = STATUS_META[status] ?? { label: status, icon: <CircleDot size={12} /> };
  return (
    <span className={`status-badge status-badge--${status}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}
