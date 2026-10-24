import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  Ban,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Hourglass,
  Info,
  ListOrdered,
  Lock,
  Plus,
  Timer,
  UserCog,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { Alert } from "../../components/Alert";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { getCurrentUser } from "../../services/authService";
import {
  PRIORITY_LABEL,
  addComment,
  cancelTicket,
  categoryLabel,
  autoCloseDate,
  canReopen,
  confirmResolution,
  getTicket,
  rateService,
  reopenDeadline,
  reopenTicket,
  type Ticket,
} from "../../services/ticketService";
import { CommentComposer } from "./CommentComposer";
import { Conversation } from "./Conversation";
import { StatusTimeline } from "./StatusTimeline";
import { ReopenSheet } from "./ReopenSheet";
import {
  AutoCloseNote,
  ClosedSummary,
  ReopenCard,
  ResolvedBanner,
  ServiceRating,
  SolutionCard,
} from "./ResolutionPanels";
import { useIsDesktop } from "../../components/useMediaQuery";
import { printReceipt } from "../../components/web/receipt";
import { TicketDetailWeb, TicketWebPlaceholder } from "./TicketDetailWeb";
import "./TicketDetailPage.css";

const CANCEL_REASONS = ["Ya se resolvió solo", "Lo reporté por error", "Ya no lo necesito", "Otro motivo"];

/** Detalle del ticket: estado, estimaciones, datos y conversación (FR-10 a FR-12, FR-15, FR-16). */
export function TicketDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [ticket, setTicket] = useState<Ticket | null | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getTicket(id).then(setTicket);
  }, [id]);

  // Versión web mientras carga o si no existe el ticket.
  if (isDesktop && !ticket) {
    return <TicketWebPlaceholder id={id} notFound={ticket === null} />;
  }

  if (ticket === undefined) {
    return (
      <div className="screen">
        <AppHeader title={`#${id}`} onBack={() => navigate(-1)} />
        <main className="screen__content detail">
          <div className="home__skeleton" />
          <div className="home__skeleton" />
        </main>
      </div>
    );
  }

  if (ticket === null) {
    return (
      <div className="screen">
        <AppHeader title="Ticket" onBack={() => navigate("/mis-tickets")} />
        <main className="screen__content detail">
          <Alert tone="error" icon={<CircleAlert size={18} />}>
            <p>No encontramos el ticket #{id}.</p>
          </Alert>
          <Link to="/mis-tickets" className="detail__link">
            Ver mis solicitudes
          </Link>
        </main>
      </div>
    );
  }

  const t = ticket;
  const waiting = t.status === "esperando_respuesta";
  const queued = t.status === "recibido" || t.status === "en_cola";
  const resolved = t.status === "resuelto";
  const closed = t.status === "cerrado";
  const finished = closed || t.status === "cancelado";
  const autoClose = autoCloseDate(t);
  const canCancel = !finished && t.status !== "resuelto";
  const technicianFirst = t.technician?.name.split(" ")[0];

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  }

  function respondNow() {
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSend(text: string, files: File[]) {
    const updated = await addComment(t.id, text, files);
    setTicket(updated);
    flash(waiting ? "Respuesta enviada. El ticket regresó a “En proceso”." : "Comentario enviado.");
    requestAnimationFrame(() =>
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }

  async function handleConfirm() {
    setBusy(true);
    setTicket(await confirmResolution(t.id));
    setBusy(false);
    flash("¡Gracias! El ticket quedó cerrado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleReopen(reason: string, files: File[]) {
    const updated = await reopenTicket(t.id, reason, files);
    setTicket(updated);
    setReopenOpen(false);
    flash("Ticket reabierto. El técnico lo revisará de nuevo.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRate(rating: number, comment: string) {
    setTicket(await rateService(t.id, rating, comment));
    flash("¡Gracias por calificar el servicio!");
  }

  function handleDownload(name: string) {
    // TODO: con el backend real, aquí se descarga el archivo del servidor.
    flash(`La descarga de “${name}” estará disponible al conectar el servidor.`);
  }

  async function handleCancel() {
    setBusy(true);
    setTicket(await cancelTicket(t.id, cancelReason));
    setBusy(false);
    setCancelOpen(false);
    flash("El ticket fue cancelado.");
  }

  // Paneles de cancelar y reabrir (los usan la versión móvil y la web).
  const sheets = (
    <>
        {/* ---------- Cancelar ---------- */}
        <BottomSheet
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title="¿Cancelar este ticket?"
          icon={<XCircle size={20} />}
          footer={
            <>
              <Button variant="outlined" onClick={() => setCancelOpen(false)} disabled={busy}>
                No, mantener
              </Button>
              <Button onClick={handleCancel} loading={busy} loadingText="Cancelando…" disabled={!cancelReason}>
                Sí, cancelar
              </Button>
            </>
          }
        >
          <p className="sheet-text">
            El técnico dejará de atenderlo. Si el problema regresa tendrás que crear una solicitud
            nueva.
          </p>
          <p className="sheet-section__group">Motivo</p>
          <div className="sheet-chips">
            {CANCEL_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                aria-pressed={cancelReason === reason}
                className={`sheet-chip ${cancelReason === reason ? "sheet-chip--on" : ""}`}
                onClick={() => setCancelReason(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
        </BottomSheet>

        {/* ---------- Reabrir (desde Resuelto o Cerrado) ---------- */}
        <ReopenSheet
          open={reopenOpen}
          technicianName={t.technician?.name}
          onClose={() => setReopenOpen(false)}
          onSubmit={handleReopen}
        />
    </>
  );

  // ---------------- Versión web ----------------
  if (isDesktop) {
    return (
      <TicketDetailWeb
        ticket={t}
        userName={user?.name ?? "Tú"}
        userArea={user?.area ?? ""}
        notice={notice}
        busy={busy}
        composerRef={composerRef}
        conversationEndRef={conversationEndRef}
        onSend={handleSend}
        onConfirm={handleConfirm}
        onRate={handleRate}
        onDownload={handleDownload}
        onOpenReopen={() => setReopenOpen(true)}
        onOpenCancel={() => setCancelOpen(true)}
        onRespondNow={respondNow}
        onReceipt={() =>
          printReceipt(
            t.id,
            [
              ["Solicitante", user ? `${user.name} (${user.email})` : ""],
              ["Título", t.title],
              ["Categoría", categoryLabel(t.category, t.subcategory)],
              ["Estado", t.status === "cerrado" ? "Cerrado" : t.status === "cancelado" ? "Cancelado" : t.status],
              ["Ubicación", t.location ?? ""],
              ["Técnico", t.technician ? `${t.technician.name} (${t.technician.team})` : ""],
              ["Creado", new Date(t.createdAt).toLocaleString("es-MX")],
              ["Resuelto", t.resolvedAt ? new Date(t.resolvedAt).toLocaleString("es-MX") : ""],
              ["Cerrado", t.closedAt ? new Date(t.closedAt).toLocaleString("es-MX") : ""],
              ["Solución", t.resolution?.text ?? ""],
            ],
            t.description,
          )
        }
        sheets={sheets}
      />
    );
  }

  return (
    <div className="screen">
      <AppHeader title={`#${t.id}`} subtitle={t.title} onBack={() => navigate(-1)} />

      <main className="screen__content detail">
        {/* ---------- Acción requerida ---------- */}
        {waiting && (
          <section className="action-card" aria-labelledby="action-title">
            <span className="action-card__icon">
              <CircleAlert size={22} />
            </span>
            <div>
              <span className="action-card__tag">Acción requerida</span>
              <h2 id="action-title">El técnico necesita información tuya</h2>
              <p>
                {t.technician && (
                  <strong>
                    {t.technician.name} (Técnico de {t.technician.team})
                  </strong>
                )}{" "}
                {t.pendingAction ?? "Te dejó una pregunta en la conversación."}
              </p>
            </div>
            <button type="button" className="action-card__btn" onClick={respondNow}>
              Responder ahora <ArrowDown size={16} />
            </button>
          </section>
        )}

        {/* ---------- Resuelto (FR-15) ---------- */}
        {resolved && <ResolvedBanner technician={t.resolution?.technician ?? t.technician?.name} />}

        {t.status === "cancelado" && (
          <div className="ended-card">
            <Ban size={18} />
            <p>Cancelaste este ticket. Si el problema regresa, crea una nueva solicitud.</p>
          </div>
        )}

        {/* ---------- Estado ---------- */}
        <section className="detail-card">
          <div className="detail-card__row">
            {closed ? (
              <span className="detail-card__closed-tags">
                <StatusBadge status={t.status} />
                {t.technician && <span className="stat__chip">{t.technician.team}</span>}
              </span>
            ) : (
              <h2 className="detail-card__label">
                {waiting || resolved ? "Estado actual" : "Estado del ticket"}
              </h2>
            )}
            {closed && t.closedAt ? (
              <span className="detail-card__date">
                {new Date(t.closedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
            ) : (
              <StatusBadge status={t.status} />
            )}
          </div>
          {t.status !== "cancelado" && <StatusTimeline status={t.status} />}
          {closed && <ClosedSummary ticket={t} />}
        </section>

        {/* ---------- Solución del técnico ---------- */}
        {resolved && t.resolution && <SolutionCard resolution={t.resolution} onDownload={handleDownload} />}
        {resolved && autoClose && <AutoCloseNote date={autoClose} />}

        {/* ---------- Cerrado: calificar y reabrir ---------- */}
        {closed && <ServiceRating ticket={t} onRate={handleRate} />}
        {closed && (
          <ReopenCard
            available={canReopen(t)}
            deadline={reopenDeadline(t)}
            onReopen={() => setReopenOpen(true)}
          />
        )}
        {closed && t.resolution && (
          <SolutionCard resolution={t.resolution} onDownload={handleDownload} />
        )}

        {/* ---------- Estimaciones / técnico ---------- */}
        {!finished && !resolved && (
          <div className="stat-grid">
            {queued ? (
              <>
                <div className="stat">
                  <div className="stat__head">
                    <ListOrdered size={16} />
                    <span className="stat__tag">Estimación</span>
                  </div>
                  <p className="stat__label">Posición en cola</p>
                  <p className="stat__value">#{t.queuePosition ?? "—"}</p>
                </div>
                <div className="stat">
                  <div className="stat__head">
                    <Hourglass size={16} />
                    <span className="stat__tag">Aproximado</span>
                  </div>
                  <p className="stat__label">Tiempo estimado</p>
                  <p className="stat__value">{t.estimatedResponse ?? "Por calcular"}</p>
                </div>
              </>
            ) : (
              <>
                <div className="stat">
                  <div className="stat__head">
                    <UserCog size={16} />
                    <span className="stat__label stat__label--inline">Técnico</span>
                  </div>
                  <p className="stat__value stat__value--sm">{t.technician?.name ?? "Por asignar"}</p>
                  {t.technician && <span className="stat__chip">{t.technician.team}</span>}
                </div>
                <div className="stat">
                  <div className="stat__head">
                    <Timer size={16} />
                    <span className="stat__label stat__label--inline">
                      {waiting ? "Plazo para responder" : "Prioridad"}
                    </span>
                  </div>
                  <p className="stat__value stat__value--sm">
                    {waiting
                      ? `${t.responseDeadlineHours ?? 48} horas`
                      : t.priority
                        ? PRIORITY_LABEL[t.priority]
                        : "Por asignar"}
                  </p>
                  {waiting && t.priority && (
                    <span className={`stat__chip stat__chip--${t.priority}`}>
                      Prioridad {PRIORITY_LABEL[t.priority].toLowerCase()}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {queued && (
          <p className="detail__estimate-note">
            La posición y el tiempo son estimados y se actualizan conforme avanza la fila.
          </p>
        )}

        {/* ---------- Detalles de la solicitud ---------- */}
        <section className="details-card">
          <button
            type="button"
            className="details-card__toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <span className="details-card__heading">
              <Info size={16} />
              <span>
                Detalles de la solicitud
                <small>
                  Creado el{" "}
                  {new Date(t.createdAt).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </span>
            </span>
            <span className="details-card__more-label">
              {detailsOpen ? "Ocultar" : "Ver más"}
              <ChevronDown size={16} className={detailsOpen ? "is-open" : ""} />
            </span>
          </button>

          <dl className="details-card__grid">
            <div>
              <dt>Categoría</dt>
              <dd>{categoryLabel(t.category, t.subcategory)}</dd>
            </div>
            <div>
              <dt>Prioridad</dt>
              <dd>
                <span className={`priority-dot priority-dot--${t.priority ?? "none"}`} />
                {t.priority ? PRIORITY_LABEL[t.priority] : "Por asignar"}
              </dd>
            </div>
          </dl>

          {detailsOpen && (
            <dl className="details-card__more">
              {t.location && (
                <div>
                  <dt>Ubicación</dt>
                  <dd>{t.location}</dd>
                </div>
              )}
              <div>
                <dt>Descripción</dt>
                <dd>{t.description}</dd>
              </div>
              <div>
                <dt>Evidencias</dt>
                <dd>{t.attachments.length ? t.attachments.join(", ") : "Sin adjuntos"}</dd>
              </div>
              <div>
                <dt>Autoservicio</dt>
                <dd>
                  {t.attemptedSteps
                    ? `${t.attemptedSteps} sugerencia${t.attemptedSteps > 1 ? "s" : ""} de la IA intentada${t.attemptedSteps > 1 ? "s" : ""}`
                    : "No se intentaron sugerencias"}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* ---------- Conversación ---------- */}
        <section className="detail__conversation" aria-labelledby="conv-title">
          <div className="detail__section-head">
            <h2 id="conv-title">Conversación</h2>
            <span>
              {t.events.length} {t.events.length === 1 ? "evento" : "eventos"}
            </span>
          </div>
          <Conversation
            events={t.events}
            userName={user?.name ?? "Tú"}
            technicianTeam={t.technician?.team}
          />
          <div ref={conversationEndRef} />
        </section>

        {notice && (
          <p className="detail__notice" role="status">
            <CircleCheck size={16} /> {notice}
          </p>
        )}

        {canCancel && (
          <button type="button" className="detail__cancel" onClick={() => setCancelOpen(true)}>
            <XCircle size={16} /> Cancelar ticket
          </button>
        )}
      </main>

      {/* ---------- Pie: confirmar / escribir / estado final ---------- */}
      {resolved ? (
        <footer className="screen__footer detail__footer detail__footer--stack">
          <Button fullWidth onClick={handleConfirm} loading={busy} loadingText="Guardando…" leadingIcon={<CircleCheck size={18} />}>
            Confirmar solución
          </Button>
          <Button variant="outlined" fullWidth onClick={() => setReopenOpen(true)} disabled={busy} leadingIcon={<X size={18} />}>
            No se resolvió
          </Button>
        </footer>
      ) : t.status === "cancelado" ? (
        <footer className="screen__footer detail__footer">
          <div className="detail__closed">
            <p>
              <Lock size={14} /> Este ticket está cancelado.
            </p>
            <Link to="/nueva-solicitud" className="detail__new">
              <Plus size={16} /> Nueva solicitud
            </Link>
          </div>
        </footer>
      ) : closed ? (
        <p className="detail__signature">
          <ShieldCheck size={13} /> IA local segura · Mesa de Ayuda
        </p>
      ) : (
        <footer className="screen__footer detail__footer">
          <CommentComposer
            ref={composerRef}
            placeholder={
              waiting && technicianFirst
                ? `Responde a ${technicianFirst}…`
                : "Escribe un comentario…"
            }
            hint={waiting ? "El técnico espera tu respuesta" : undefined}
            onSend={handleSend}
          />
        </footer>
      )}

      {sheets}
    </div>
  );
}
