import type { ReactNode, RefObject } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  BarChart3,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Hash,
  Hourglass,
  House,
  Image,
  Inbox,
  Info,
  ListOrdered,
  Lock,
  MapPin,
  MessageSquareText,
  Paperclip,
  Pause,
  QrCode,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  UserRound,
  Wrench,
  XCircle,
  ChevronRight,
  ArrowDown,
} from "lucide-react";

import { WebShell, WebCard } from "../../components/web/WebShell";
import { StatusBadge } from "../../components/StatusBadge";
import { subcategoryIcon } from "../../components/subcategoryIcons";
import { Button } from "../../components/Button";
import {
  AUTO_CLOSE_BUSINESS_DAYS,
  CATEGORIES,
  IMPACT_LABEL,
  PRIORITY_LABEL,
  autoCloseDate,
  canReopen,
  categoryLabel,
  formatFileSize,
  reopenDeadline,
  type Ticket,
  type TicketEvent,
} from "../../services/ticketService";
import { CommentComposer } from "./CommentComposer";
import { ReopenCard, ServiceRating } from "./ResolutionPanels";
import "./TicketDetailWeb.css";

// ---------------- Ayudantes ----------------

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

function dayTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Hoy, ${time(iso)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${time(iso)}`;
  return `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${time(iso)}`;
}

function duration(fromIso: string, toIso: string) {
  const minutes = Math.max(1, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} min`;
  return `${mins} min`;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

// ---------------- Línea de progreso ----------------

const STEP_INDEX: Record<Ticket["status"], number> = {
  recibido: 0,
  en_cola: 1,
  en_proceso: 2,
  esperando_respuesta: 2,
  resuelto: 3,
  cerrado: 4,
  cancelado: -1,
};

/** Momento en que el ticket pasó por cada etapa (según su bitácora). */
function stepTimes(t: Ticket) {
  const firstOf = (kind: TicketEvent["kind"]) => t.events.find((e) => e.kind === kind)?.at;
  return {
    queued: firstOf("supervisor"),
    inProgress: firstOf("tecnico"),
  };
}

const shortDate = (iso: string) =>
  `${new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${time(iso)}`;

function ProgressCard({ t }: { t: Ticket }) {
  const current = STEP_INDEX[t.status];
  const times = stepTimes(t);
  const closed = t.status === "cerrado";
  const waiting = t.status === "esperando_respuesta";
  const steps = [
    { label: "Recibido", icon: <Inbox size={18} />, sub: closed ? shortDate(t.createdAt) : time(t.createdAt) },
    {
      label: "En cola",
      icon: <Hourglass size={18} />,
      sub:
        current === 1 && t.queuePosition
          ? `Posición #${t.queuePosition}`
          : current > 1
            ? closed && times.queued
              ? shortDate(times.queued)
              : "Asignado"
            : "En espera",
    },
    {
      label: "En proceso",
      icon: <Wrench size={18} />,
      sub: waiting
        ? "Esperando tu respuesta"
        : closed && times.inProgress
          ? shortDate(times.inProgress)
          : t.technician
            ? t.technician.name
            : "Técnico por asignar",
    },
    {
      label: "Resuelto",
      icon: <CircleCheck size={18} />,
      sub: t.resolvedAt ? dayTime(t.resolvedAt) : "Diagnóstico final",
    },
    {
      label: "Cerrado",
      icon: <Lock size={18} />,
      sub: t.closedAt ? dayTime(t.closedAt) : "Tu confirmación",
    },
  ];
  const tone = waiting ? "wait" : t.status === "resuelto" || t.status === "cerrado" ? "ok" : "normal";

  return (
    <WebCard className="tdw-progress">
      <div className="tdw-card-head">
        <h2>
          <ListOrdered size={18} /> Progreso de atención
        </h2>
        <span className={`tdw-stage tdw-stage--${tone}`}>
          {t.status === "cerrado" ? (
            <>
              <CircleCheck size={12} /> Ciclo finalizado
            </>
          ) : (
            `Etapa ${current + 1} de 5`
          )}
        </span>
      </div>
      <ol className={`tdw-steps tdw-steps--${tone}`}>
        {steps.map((step, i) => {
          const done = i < current || (t.status === "cerrado" && i === current);
          const isCurrent = i === current && t.status !== "cerrado";
          const state = done ? "done" : isCurrent ? "current" : "todo";
          return (
            <li key={step.label} className={`tdw-step tdw-step--${state}`} aria-current={isCurrent ? "step" : undefined}>
              <span className="tdw-step__dot">
                {done ? <Check size={18} strokeWidth={3} /> : isCurrent && waiting ? <Pause size={16} /> : step.icon}
              </span>
              <strong>{step.label}</strong>
              <small className={isCurrent && waiting ? "tdw-step__sub--wait" : ""}>{step.sub}</small>
            </li>
          );
        })}
      </ol>
    </WebCard>
  );
}

// ---------------- Conversación ----------------

function ConversationItem({ e, userName, team, firstMineId }: { e: TicketEvent; userName: string; team?: string; firstMineId?: string }) {
  if (e.kind === "sistema" || e.kind === "supervisor") {
    return (
      <li className="tdw-event">
        <span className="tdw-event__icon">{e.kind === "sistema" ? <ClipboardList size={15} /> : <ShieldCheck size={15} />}</span>
        <p>
          <strong>{e.author}:</strong> {e.text}
        </p>
        <time dateTime={e.at}>{dayTime(e.at)}</time>
      </li>
    );
  }
  const mine = e.kind === "empleado";
  return (
    <li className={`tdw-msg ${mine ? "tdw-msg--mine" : "tdw-msg--tech"}`}>
      <span className="tdw-msg__avatar">{initials(mine ? userName : e.author)}</span>
      <div className="tdw-msg__bubble">
        <div className="tdw-msg__head">
          <strong>{mine ? `${userName} (Tú)` : e.author}</strong>
          <span className={`tdw-role ${mine ? "" : "tdw-role--tech"}`}>
            {mine ? (e.id === firstMineId ? "Solicitante" : "Tu mensaje") : `Técnico${team ? ` de ${team}` : ""}`}
          </span>
          <time dateTime={e.at}>{dayTime(e.at)}</time>
        </div>
        <p>{e.text}</p>
        {e.attachments && e.attachments.length > 0 && (
          <ul className="tdw-msg__files">
            {e.attachments.map((name) => (
              <li key={name}>
                <Image size={13} /> {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// ---------------- Página ----------------

interface Props {
  ticket: Ticket;
  userName: string;
  userArea: string;
  notice: string;
  busy: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  conversationEndRef: RefObject<HTMLDivElement | null>;
  onSend: (text: string, files: File[]) => Promise<void>;
  onConfirm: () => void;
  onRate: (rating: number, comment: string) => Promise<void>;
  onDownload: (name: string) => void;
  onOpenReopen: () => void;
  onOpenCancel: () => void;
  onRespondNow: () => void;
  onReceipt: () => void;
  sheets: ReactNode;
}

export function TicketDetailWeb({
  ticket: t,
  userName,
  userArea,
  notice,
  busy,
  composerRef,
  conversationEndRef,
  onSend,
  onConfirm,
  onRate,
  onDownload,
  onOpenReopen,
  onOpenCancel,
  onRespondNow,
  onReceipt,
  sheets,
}: Props) {
  const waiting = t.status === "esperando_respuesta";
  const queued = t.status === "recibido" || t.status === "en_cola";
  const resolved = t.status === "resuelto";
  const closed = t.status === "cerrado";
  const cancelled = t.status === "cancelado";
  const finished = closed || cancelled;
  const canCancel = !finished && !resolved;
  const autoClose = autoCloseDate(t);
  const technicianFirst = t.technician?.name.split(" ")[0];
  const firstMineId = t.events.find((e) => e.kind === "empleado")?.id;
  const techFiles = t.resolution?.attachments ?? [];
  const totalFiles = t.attachments.length + techFiles.length;
  // Primera respuesta humana: el supervisor o el técnico.
  const firstResponse = t.events.find((e) => e.kind === "supervisor" || e.kind === "tecnico")?.at;

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">
          <House size={13} /> Inicio
        </Link>
        <ChevronRight size={14} />
        <Link to="/mis-tickets">Mis solicitudes</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Ticket #{t.id}</span>
      </nav>

      {notice && (
        <p className="tdw-notice" role="status">
          <CircleCheck size={16} /> {notice}
        </p>
      )}

      <div className="tdw">
        {/* ================= Columna principal ================= */}
        <div className="tdw-main">
          {/* Encabezado */}
          <WebCard className="tdw-header">
            <div className="tdw-header__top">
              <span className="tdw-id">
                <Hash size={13} /> {t.id}
              </span>
              <span className="tdw-created">
                <Clock size={14} />{" "}
                {closed && t.closedAt
                  ? `Cerrado definitivamente: ${dayTime(t.closedAt)}`
                  : resolved && t.resolvedAt
                    ? `Resuelto: ${dayTime(t.resolvedAt)}`
                    : `Creado: ${dayTime(t.createdAt)}`}
              </span>
              <StatusBadge status={t.status} />
            </div>
            <h1>{t.title}</h1>
            <p className="tdw-header__meta">
              <span>
                {subcategoryIcon(t.subcategory, 14)} {categoryLabel(t.category, t.subcategory)}
              </span>
              {t.location && (
                <span>
                  <MapPin size={14} /> {t.location}
                </span>
              )}
              {t.inventoryTag && (
                <span>
                  <QrCode size={14} /> Equipo: {t.inventoryTag}
                </span>
              )}
              {t.priority && (
                <span className={`tdw-prio tdw-prio--${t.priority}`}>
                  <CircleAlert size={14} /> Prioridad {PRIORITY_LABEL[t.priority].toLowerCase()}
                </span>
              )}
            </p>
          </WebCard>

          {/* Acción requerida */}
          {waiting && (
            <section className="tdw-action" aria-labelledby="tdw-action-title">
              <span className="tdw-action__icon">
                <MessageSquareText size={20} />
              </span>
              <div>
                <h2 id="tdw-action-title">El técnico necesita información tuya para continuar</h2>
                <p>
                  {t.technician && <strong>{t.technician.name}</strong>}{" "}
                  {t.pendingAction ?? "te dejó una pregunta en la conversación."} Tu respuesta reactivará
                  la atención de inmediato.
                </p>
                <button type="button" onClick={onRespondNow}>
                  Ir a redactar mi respuesta <ArrowDown size={14} />
                </button>
              </div>
            </section>
          )}

          {cancelled && (
            <div className="ended-card">
              <Ban size={18} />
              <p>Cancelaste este ticket. Si el problema regresa, crea una nueva solicitud.</p>
            </div>
          )}

          {!cancelled && <ProgressCard t={t} />}

          {/* Cerrado: calificar */}
          {closed && <ServiceRating ticket={t} onRate={onRate} />}

          {/* Solución del técnico (resuelto o cerrado) */}
          {(resolved || closed) && t.resolution && (
            <WebCard className="tdw-solution">
              <div className="tdw-solution__head">
                <span className="tdw-solution__icon">
                  <CircleCheck size={22} />
                </span>
                <div>
                  <h2>{closed ? "Solución documentada" : "Solución aplicada por el equipo técnico"}</h2>
                  <p>
                    Técnico: <strong>{t.resolution.technician}</strong> ({t.resolution.team})
                  </p>
                </div>
                <span className="tdw-solution__time">
                  <Check size={13} /> {dayTime(t.resolution.at)}
                </span>
              </div>
              <p className="tdw-solution__text">{t.resolution.text}</p>
              {t.resolution.attachments.length > 0 && (
                <>
                  <p className="tdw-solution__files-title">
                    <Paperclip size={14} /> Evidencia técnica adjunta
                  </p>
                  <ul className="tdw-files tdw-files--row">
                    {t.resolution.attachments.map((f) => (
                      <li key={f.name}>
                        <span className="tdw-files__icon tdw-files__icon--pink">
                          <FileText size={18} />
                        </span>
                        <span className="tdw-files__info">
                          <strong>{f.name}</strong>
                          <small>{formatFileSize(f.size)} · Documento</small>
                        </span>
                        <button type="button" onClick={() => onDownload(f.name)} aria-label={`Descargar ${f.name}`}>
                          <Download size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </WebCard>
          )}

          {/* Confirmar (resuelto) */}
          {resolved && (
            <WebCard className="tdw-confirm">
              <div className="tdw-confirm__head">
                <ThumbsUp size={20} />
                <div>
                  <h2>¿El problema quedó completamente resuelto?</h2>
                  <p>Revisa que todo funcione como esperabas antes de confirmar.</p>
                </div>
              </div>
              <div className="tdw-confirm__actions">
                <Button onClick={onConfirm} loading={busy} loadingText="Guardando…" leadingIcon={<ThumbsUp size={16} />}>
                  Confirmar solución
                </Button>
                <Button variant="outlined" onClick={onOpenReopen} disabled={busy} leadingIcon={<ThumbsDown size={16} />}>
                  No se resolvió
                </Button>
              </div>
              {autoClose && (
                <p className="tdw-confirm__note">
                  <Info size={14} /> Si no confirmas, el ticket se cerrará automáticamente el{" "}
                  <strong>{dayTime(autoClose.toISOString())}</strong> ({AUTO_CLOSE_BUSINESS_DAYS} días hábiles).
                </p>
              )}
            </WebCard>
          )}

          {/* Conversación */}
          <WebCard className="tdw-conv">
            <div className="tdw-card-head">
              <h2>
                <MessageSquareText size={18} /> Conversación e historial {finished ? "(cerrado)" : `(${t.events.length})`}
              </h2>
              <span className="tdw-muted">
                <Lock size={13} /> Visible para ti y el equipo técnico
              </span>
            </div>
            <ol className="tdw-thread">
              {t.events.map((e) => (
                <ConversationItem key={e.id} e={e} userName={userName} team={t.technician?.team} firstMineId={firstMineId} />
              ))}
            </ol>
            <div ref={conversationEndRef} />

            {finished && (
              <div className="tdw-locked">
                <Lock size={18} />
                <p>
                  <strong>Este ticket está {closed ? "cerrado" : "cancelado"} para nuevos comentarios.</strong>
                  {closed && canReopen(t)
                    ? "Si el problema regresa, puedes reabrirlo desde el panel de la derecha o crear una nueva solicitud."
                    : "Si tienes un problema nuevo o parecido, crea una nueva solicitud."}
                </p>
              </div>
            )}

            {!finished && (
              <div className="tdw-composer">
                <CommentComposer
                  ref={composerRef}
                  variant="web"
                  highlight={waiting}
                  title={
                    waiting && t.technician
                      ? `Responder a ${t.technician.name}:`
                      : resolved
                        ? "Añadir una observación (opcional)"
                        : "Responder o añadir información"
                  }
                  placeholder={
                    waiting && technicianFirst
                      ? `Escribe tu respuesta para ${technicianFirst}…`
                      : resolved
                        ? "Escribe aquí si quieres dejar una nota al técnico…"
                        : "Escribe un comentario o información adicional…"
                  }
                  sendLabel={waiting ? "Enviar respuesta" : resolved ? "Enviar nota" : "Enviar mensaje"}
                  note={waiting ? undefined : "Visible para ti y el equipo técnico"}
                  onSend={onSend}
                />
                {waiting && (
                  <p className="tdw-composer__hint">
                    <Info size={14} /> Al responder, el ticket regresa a “En proceso” con el técnico.
                  </p>
                )}
              </div>
            )}
          </WebCard>
        </div>

        {/* ================= Columna lateral ================= */}
        <aside className="tdw-side">
          {/* Cerrado: reapertura primero */}
          {closed && (
            <div className="tdw-reopen">
              <ReopenCard available={canReopen(t)} deadline={reopenDeadline(t)} onReopen={onOpenReopen} />
            </div>
          )}

          {/* Métricas / estado */}
          {queued && (
            <WebCard>
              <h2 className="tdw-side__title">
                <BarChart3 size={18} /> Atención en cola
              </h2>
              <div className="tdw-metric">
                <span className="tdw-metric__icon">
                  <ListOrdered size={20} />
                </span>
                <div>
                  <small>Posición en la cola</small>
                  <strong>
                    {t.queuePosition ?? "—"} <em>(estimación)</em>
                  </strong>
                </div>
              </div>
              <div className="tdw-metric tdw-metric--col">
                <div className="tdw-metric__row">
                  <small>Tiempo estimado de atención:</small>
                  <strong>{t.estimatedResponse ?? "Por calcular"}</strong>
                </div>
                <p>Es un estimado: puede variar según la urgencia y la disponibilidad de técnicos.</p>
              </div>
            </WebCard>
          )}

          {(t.status === "en_proceso" || waiting) && (
            <WebCard>
              <h2 className="tdw-side__title">
                <Timer size={18} /> Estado de atención
              </h2>
              {waiting ? (
                <div className="tdw-pause">
                  <Pause size={16} />
                  <p>
                    <strong>En pausa</strong>
                    Esperando tu respuesta. Tienes {t.responseDeadlineHours ?? 48} horas para responder.
                  </p>
                </div>
              ) : (
                <div className="tdw-pause tdw-pause--ok">
                  <Wrench size={16} />
                  <p>
                    <strong>En atención</strong>
                    {t.statusNote ?? "El técnico está trabajando en tu caso."}
                  </p>
                </div>
              )}
              <p className="tdw-side__label">Técnico asignado</p>
              {t.technician ? (
                <div className="tdw-tech">
                  <span>{initials(t.technician.name)}</span>
                  <div>
                    <strong>{t.technician.name}</strong>
                    <small>{t.technician.team}</small>
                  </div>
                </div>
              ) : (
                <p className="tdw-muted">Por asignar</p>
              )}
              <Button variant="outlined" fullWidth leadingIcon={<MessageSquareText size={16} />} onClick={onRespondNow}>
                Escribir al técnico
              </Button>
            </WebCard>
          )}

          {closed && (
            <WebCard>
              <h2 className="tdw-side__title">
                <BarChart3 size={18} /> Métricas del servicio
              </h2>
              <ul className="tdw-metrics-list">
                {firstResponse && (
                  <li>
                    <span>
                      <Timer size={15} /> Tiempo de primera respuesta
                    </span>
                    <strong>{duration(t.createdAt, firstResponse)}</strong>
                  </li>
                )}
                {t.resolvedAt && (
                  <li>
                    <span>
                      <CircleCheck size={15} /> Tiempo total de resolución
                    </span>
                    <strong>{duration(t.createdAt, t.resolvedAt)}</strong>
                  </li>
                )}
                <li>
                  <span>
                    <Lock size={15} /> Cierre
                  </span>
                  <strong>{t.closedBy === "automatico" ? "Automático" : "Confirmado por ti"}</strong>
                </li>
                <li>
                  <span>
                    <ThumbsUp size={15} /> Calificación otorgada
                  </span>
                  <strong className={t.serviceRating ? "tdw-metrics-list__ok" : ""}>
                    {t.serviceRating ? `${t.serviceRating.rating}/5 estrellas` : "Sin calificar"}
                  </strong>
                </li>
              </ul>
            </WebCard>
          )}

          {resolved && (
            <WebCard>
              <h2 className="tdw-side__title">
                <BarChart3 size={18} /> Resolución
              </h2>
              <div className="tdw-resolved">
                <CircleCheck size={20} />
                <div>
                  <small>{closed ? "Estado de cierre" : "Estado"}</small>
                  <strong>
                    {closed
                      ? t.closedBy === "automatico"
                        ? "Cerrado automáticamente"
                        : "Confirmado por ti"
                      : "Pendiente de tu confirmación"}
                  </strong>
                </div>
              </div>
              {t.resolvedAt && (
                <div className="tdw-metric tdw-metric--col">
                  <div className="tdw-metric__row">
                    <small>Tiempo de atención:</small>
                    <strong>{duration(t.createdAt, t.resolvedAt)}</strong>
                  </div>
                  <p>Desde que se creó el ticket hasta que el técnico lo resolvió.</p>
                </div>
              )}
              <div className="tdw-kv">
                <span>Calificación:</span>
                <strong>
                  {t.serviceRating
                    ? `${"★".repeat(t.serviceRating.rating)}${"☆".repeat(5 - t.serviceRating.rating)}`
                    : closed
                      ? "Sin calificar"
                      : "Pendiente de confirmación"}
                </strong>
              </div>
            </WebCard>
          )}

          {/* Detalles */}
          <WebCard>
            <h2 className="tdw-side__title">
              <SlidersHorizontal size={18} /> Detalles del ticket
            </h2>
            <dl className="tdw-details">
              <div>
                <dt>Dominio / categoría</dt>
                <dd>
                  <span className="tdw-bullet" /> {CATEGORIES.find((c) => c.id === t.category)?.title}
                </dd>
              </div>
              {t.subcategory && (
                <div>
                  <dt>Subcategoría</dt>
                  <dd>{categoryLabel(t.category, t.subcategory)}</dd>
                </div>
              )}
              {t.location && (
                <div>
                  <dt>Ubicación</dt>
                  <dd>
                    <MapPin size={14} /> {t.location}
                  </dd>
                </div>
              )}
              {t.impact && (
                <div>
                  <dt>Impacto reportado</dt>
                  <dd>
                    <span className={`nrw-impact nrw-impact--${t.impact}`}>{IMPACT_LABEL[t.impact]}</span>
                  </dd>
                </div>
              )}
              <div>
                <dt>Solicitante</dt>
                <dd>
                  <UserRound size={14} /> {userName} <small>({userArea})</small>
                </dd>
              </div>
              <div>
                <dt>Técnico asignado</dt>
                <dd>
                  {t.technician ? (
                    `${t.technician.name} (${t.technician.team})`
                  ) : (
                    <em className="tdw-muted">Por asignar en la fila de atención</em>
                  )}
                </dd>
              </div>
              {t.inventoryTag && (
                <div>
                  <dt>Equipo asociado</dt>
                  <dd>
                    <QrCode size={14} /> {t.inventoryTag}
                  </dd>
                </div>
              )}
              {t.attemptedSteps !== undefined && (
                <div>
                  <dt>Autoservicio</dt>
                  <dd>
                    {t.attemptedSteps} sugerencia{t.attemptedSteps === 1 ? "" : "s"} de la IA intentada{t.attemptedSteps === 1 ? "" : "s"}
                  </dd>
                </div>
              )}
            </dl>
          </WebCard>

          {/* Archivos */}
          <WebCard>
            <div className="tdw-card-head">
              <h2 className="tdw-side__title tdw-side__title--flat">
                <Paperclip size={18} /> Archivos adjuntos
              </h2>
              <span className="tdw-count">{totalFiles}</span>
            </div>
            {totalFiles === 0 ? (
              <p className="tdw-muted">Sin archivos adjuntos.</p>
            ) : (
              <ul className="tdw-files">
                {t.attachments.map((name) => (
                  <li key={name}>
                    <span className="tdw-files__icon">
                      <Image size={16} />
                    </span>
                    <span className="tdw-files__info">
                      <strong>{name}</strong>
                      <small>Subido por ti</small>
                    </span>
                    <button type="button" onClick={() => onDownload(name)} aria-label={`Descargar ${name}`}>
                      <Download size={16} />
                    </button>
                  </li>
                ))}
                {techFiles.map((f) => (
                  <li key={f.name}>
                    <span className="tdw-files__icon tdw-files__icon--pink">
                      <FileText size={16} />
                    </span>
                    <span className="tdw-files__info">
                      <strong>{f.name}</strong>
                      <small>
                        {formatFileSize(f.size)} · Por {t.resolution?.technician}
                      </small>
                    </span>
                    <button type="button" onClick={() => onDownload(f.name)} aria-label={`Descargar ${f.name}`}>
                      <Download size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </WebCard>

          {/* Comprobante (cerrado o cancelado) */}
          {finished && (
            <WebCard>
              <h2 className="tdw-side__title">
                <Download size={18} /> Descargas y comprobantes
              </h2>
              <p className="tdw-receipt-text">
                Genera un resumen de este ticket para tus registros o para auditoría de activos.
              </p>
              <Button variant="outlined" fullWidth leadingIcon={<FileText size={16} />} onClick={onReceipt}>
                Descargar comprobante (PDF)
              </Button>
            </WebCard>
          )}

          {/* Cancelar */}
          {canCancel && (
            <WebCard className="tdw-cancel">
              <button type="button" onClick={onOpenCancel}>
                <XCircle size={18} /> Cancelar ticket
              </button>
              <p>Puedes cancelarlo si el problema se resolvió por sí solo o ya no es necesario.</p>
            </WebCard>
          )}

          {(resolved || closed) && (
            <Link to="/nueva-solicitud" className="tdw-newlink">
              <RotateCcw size={14} /> ¿Tienes otro problema? Crea una nueva solicitud
            </Link>
          )}
        </aside>
      </div>

      {sheets}
    </WebShell>
  );
}

/** Mientras carga o si el ticket no existe (versión web). */
export function TicketWebPlaceholder({ id, notFound }: { id: string; notFound: boolean }) {
  return (
    <WebShell>
      {notFound ? (
        <WebCard className="tdw-notfound">
          <CircleAlert size={32} />
          <h1>No encontramos el ticket #{id}</h1>
          <Link to="/mis-tickets">Ver mis solicitudes</Link>
        </WebCard>
      ) : (
        <div className="tdw">
          <div className="tdw-main">
            <div className="home__skeleton" />
            <div className="home__skeleton" />
          </div>
          <div className="tdw-side">
            <div className="home__skeleton" />
          </div>
        </div>
      )}
    </WebShell>
  );
}
