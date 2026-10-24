import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  FileText,
  History,
  Lock,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  RefreshCw,
  RotateCcw,
  SearchX,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Ticket,
  TriangleAlert,
} from "lucide-react";

import { WebShell, WebCard } from "../../components/web/WebShell";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { subcategoryIcon } from "../../components/subcategoryIcons";
import { ANALYSIS_STAGES, type Confidence, type Suggestion } from "../../services/aiService";
import {
  CATEGORIES,
  ESTIMATES,
  categoryLabel,
  formatFileSize,
  type SupportRequest,
} from "../../services/ticketService";
import "./SuggestionsWeb.css";

type Phase = "loading" | "results" | "empty" | "error";

const CONFIDENCE: Record<Confidence, { label: string; icon: React.ReactNode }> = {
  alta: { label: "Confianza alta", icon: <CircleCheck size={13} /> },
  media: { label: "Confianza media", icon: <CircleHelp size={13} /> },
  baja: { label: "Confianza baja", icon: <TriangleAlert size={13} /> },
};

/** Convierte `texto` en <code>texto</code>. */
function renderStep(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : <span key={i}>{part}</span>,
  );
}

interface Props {
  request: SupportRequest | undefined;
  phase: Phase;
  stage: number;
  suggestions: Suggestion[];
  attempted: Set<string>;
  onAttempted: (id: string, value: boolean) => void;
  busy: "resolve" | "escalate" | null;
  actionError: string;
  onResolved: () => void;
  onEscalate: () => void;
  onEdit: () => void;
  onRetry: () => void;
}

export function SuggestionsWeb({
  request,
  phase,
  stage,
  suggestions,
  attempted,
  onAttempted,
  busy,
  actionError,
  onResolved,
  onEscalate,
  onEdit,
  onRetry,
}: Props) {
  const loading = phase === "loading" || !request;
  const [worked, setWorked] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const progress = Math.round(((stage + 1) / ANALYSIS_STAGES.length) * 100);
  const current = ANALYSIS_STAGES[stage] ?? ANALYSIS_STAGES[0];

  const crumb = loading ? "Analizando con IA" : "Sugerencias de autoservicio";

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">Inicio</Link>
        <ChevronRight size={14} />
        <Link to="/mis-tickets">Solicitudes</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{crumb}</span>
      </nav>

      <header className="sgw-head">
        <div>
          {loading ? (
            <h1 className="sgw-head__loading">
              <span className="sgw-spinner" aria-hidden="true" />
              Buscando soluciones en la base de conocimiento…
            </h1>
          ) : (
            <h1>{phase === "empty" ? "Revisamos tu solicitud" : "Sugerencias para tu problema"}</h1>
          )}
          <p>
            {loading
              ? "El modelo de IA local está revisando documentación técnica autorizada para intentar resolver tu problema de inmediato."
              : "Revisa las soluciones basadas en manuales oficiales antes de pedir ayuda a un técnico."}
          </p>
        </div>
        <span className="sgw-chip">
          <Sparkles size={14} /> Generadas por IA con documentos autorizados · <strong>La IA solo recomienda</strong>
        </span>
      </header>

      {loading && (
        <WebCard className="sgw-progress">
          <div className="sgw-progress__row" role="status">
            <span>{current.detail}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="sgw-progress__track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </WebCard>
      )}

      <div className="sgw">
        {/* ---------- Columna principal ---------- */}
        <div className="sgw-main">
          {loading &&
            [5, 4].map((rows, i) => (
              <WebCard key={i} className="sgw-skeleton">
                <div className="skeleton-card__head">
                  <span className="sk sk--title" />
                  <span className="sk sk--pill" />
                </div>
                <span className="sk sk--sub" style={{ width: "70%", height: 18 }} />
                {Array.from({ length: rows }).map((_, r) => (
                  <div key={r} className="skeleton-card__row">
                    <span className="sk sk--dot" />
                    <span className="sk sk--line" style={{ width: `${92 - r * 9}%` }} />
                  </div>
                ))}
              </WebCard>
            ))}

          {phase === "error" && (
            <WebCard>
              <Alert tone="error" icon={<CircleAlert size={18} />}>
                <p>El asistente no respondió. Puedes intentarlo de nuevo o crear el ticket directamente.</p>
              </Alert>
              <div className="sgw-error-actions">
                <Button variant="outlined" leadingIcon={<RotateCcw size={16} />} onClick={onRetry}>
                  Reintentar
                </Button>
                <Button leadingIcon={<Ticket size={16} />} onClick={onEscalate} loading={busy === "escalate"} loadingText="Creando ticket…">
                  Crear ticket
                </Button>
              </div>
            </WebCard>
          )}

          {phase === "results" &&
            suggestions.map((s, i) => {
              const conf = CONFIDENCE[s.confidence];
              const pct = Math.round(s.source.relevance * 100);
              const tried = attempted.has(s.id);
              return (
                <WebCard key={s.id} className={`sgw-card ${worked === s.id ? "sgw-card--worked" : ""}`}>
                  <div className="sgw-card__head">
                    <span className="sgw-card__num">{i + 1}</span>
                    <h2>{s.title}</h2>
                    <span className={`sg-card__confidence sg-card__confidence--${s.confidence}`}>
                      {conf.icon} {conf.label} ({pct}%)
                    </span>
                  </div>

                  <p className="sgw-card__label">Pasos guiados de resolución:</p>
                  <ol className="sgw-card__steps">
                    {s.steps.map((step, j) => (
                      <li key={j}>{renderStep(step)}</li>
                    ))}
                  </ol>

                  <div className="sgw-source">
                    <FileText size={16} />
                    <span>
                      <strong>{s.source.title}</strong> · {s.source.docId}
                    </span>
                    <button
                      type="button"
                      aria-expanded={openSource === s.id}
                      onClick={() => setOpenSource(openSource === s.id ? null : s.id)}
                    >
                      {openSource === s.id ? "Ocultar fuente" : "Ver fuente"} <ChevronRight size={14} />
                    </button>
                    {openSource === s.id && (
                      <p className="sgw-source__more">
                        Sección: <strong>{s.source.section}</strong> · Relevancia para tu caso: <strong>{pct}%</strong>.
                        Documento autorizado de la base de conocimiento institucional.
                      </p>
                    )}
                  </div>

                  <div className="sgw-card__foot">
                    {worked === s.id ? (
                      <div className="sgw-worked" role="status">
                        <CircleCheck size={16} />
                        <span>¡Qué bien! ¿Marcamos tu solicitud como resuelta?</span>
                        <Button onClick={onResolved} loading={busy === "resolve"} loadingText="Guardando…">
                          Sí, resolver
                        </Button>
                        <button type="button" className="sgw-link" onClick={() => setWorked(null)}>
                          Todavía no
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>¿Te sirvió este paso?</span>
                        <div className="sgw-vote">
                          <button
                            type="button"
                            onClick={() => {
                              onAttempted(s.id, true);
                              setWorked(s.id);
                            }}
                          >
                            <ThumbsUp size={15} /> Sí, funcionó
                          </button>
                          <button
                            type="button"
                            aria-pressed={tried}
                            className={tried ? "is-on" : ""}
                            onClick={() => onAttempted(s.id, !tried)}
                          >
                            <ThumbsDown size={15} /> {tried ? "Lo intenté, no resolvió" : "No resolvió"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </WebCard>
              );
            })}

          {phase === "empty" && (
            <>
              <WebCard className="sgw-empty">
                <span className="sgw-empty__chip">
                  <SearchX size={14} /> Sin coincidencia en las guías autorizadas
                </span>
                <div className="outcome__art outcome__art--neutral" aria-hidden="true">
                  <Bot size={44} />
                  <span className="outcome__art-badge">?</span>
                </div>
                <h2>No encontré una sugerencia confiable</h2>
                <p>
                  Tu problema necesita el diagnóstico de un técnico especializado. Puedes crear el
                  ticket ahora mismo.
                </p>
                <div className="sgw-empty__actions">
                  <Button onClick={onEscalate} loading={busy === "escalate"} loadingText="Creando ticket…" icon={<ArrowRight size={18} />}>
                    Crear ticket ahora
                  </Button>
                  <Button variant="outlined" leadingIcon={<Pencil size={16} />} onClick={onEdit} disabled={busy !== null}>
                    Modificar reporte
                  </Button>
                </div>
                <p className="sgw-empty__note">
                  <CircleCheck size={14} /> Tu descripción, ubicación y archivos se enviarán con el ticket; no tendrás que escribirlos otra vez.
                </p>
              </WebCard>

              <WebCard className="sgw-extra">
                <h3>
                  <CircleHelp size={16} /> Otras vías de ayuda
                </h3>
                <div>
                  <a href="tel:+520000000000" className="sgw-extra__item">
                    <Phone size={18} />
                    <span>
                      <strong>¿Es una emergencia crítica en tu sede?</strong>
                      Llama a la Mesa de Ayuda para atención inmediata.
                    </span>
                  </a>
                  <Link to="/mis-tickets?vista=historial" className="sgw-extra__item">
                    <History size={18} />
                    <span>
                      <strong>Revisa tus solicitudes anteriores</strong>
                      Quizá ya resolvimos algo parecido antes.
                    </span>
                  </Link>
                </div>
              </WebCard>
            </>
          )}

          {loading && (
            <p className="sgw-privacy">
              <ShieldCheck size={18} />
              <span>
                <strong>Seguridad y privacidad</strong>
                Se consultan documentos autorizados en el servidor local de la institución. Tus datos no salen de la red interna.
              </span>
            </p>
          )}
        </div>

        {/* ---------- Columna derecha: tu solicitud ---------- */}
        <aside className="sgw-side">
          <WebCard className="sgw-request">
            <div className="sgw-request__head">
              <h2>{phase === "empty" ? "Tu solicitud" : "Tu solicitud en proceso"}</h2>
              {request && <span className="sgw-request__id">#{request.id}</span>}
            </div>

            {request ? (
              <dl>
                <div>
                  <dt>Categoría</dt>
                  <dd>
                    <span className="sgw-cat">
                      {subcategoryIcon(request.subcategory, 14)}
                      {CATEGORIES.find((c) => c.id === request.category)?.title}
                      {request.subcategory && ` · ${categoryLabel(request.category, request.subcategory)}`}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Título reportado</dt>
                  <dd className="sgw-request__title">{request.title}</dd>
                </div>
                <div>
                  <dt>Descripción</dt>
                  <dd className="sgw-request__desc">“{request.description}”</dd>
                </div>
                {request.location && (
                  <div className="sgw-request__inline">
                    <dt>
                      <MapPin size={14} /> Ubicación
                    </dt>
                    <dd>{request.location}</dd>
                  </div>
                )}
                <div className="sgw-request__inline">
                  <dt>
                    <Paperclip size={14} /> Evidencia adjunta
                  </dt>
                  <dd>
                    {request.attachments.length === 0
                      ? "Sin archivos"
                      : request.attachments.map((a) => (
                          <span key={a.name} className="sgw-file">
                            {a.name} <small>{formatFileSize(a.size)}</small>
                          </span>
                        ))}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="home__skeleton" />
            )}

            {phase === "empty" && request && (
              <p className="sgw-eta">
                <History size={14} />
                <span>
                  Tiempo de respuesta estimado si creas el ticket:{" "}
                  <strong>{ESTIMATES[request.category].toLowerCase()}</strong>.
                </span>
              </p>
            )}

            {actionError && (
              <Alert tone="error" icon={<CircleAlert size={16} />}>
                <p>{actionError}</p>
              </Alert>
            )}

            <div className="sgw-request__actions">
              {loading ? (
                <>
                  <Button fullWidth disabled leadingIcon={<RefreshCw size={16} className="sgw-spin" />}>
                    Generando recomendaciones…
                  </Button>
                  <Button variant="outlined" fullWidth leadingIcon={<Ticket size={16} />} onClick={onEscalate} disabled={!request || busy !== null}>
                    Cancelar y crear ticket directo
                  </Button>
                  <p className="sgw-request__note">
                    Si ninguna solución te sirve, podrás pasar tu caso al equipo técnico en un clic.
                  </p>
                </>
              ) : phase === "results" ? (
                <>
                  <Button fullWidth leadingIcon={<CircleCheck size={18} />} onClick={onResolved} loading={busy === "resolve"} loadingText="Guardando…" disabled={busy !== null}>
                    Esto resolvió mi problema
                  </Button>
                  <Button variant="outlined" fullWidth leadingIcon={<CircleHelp size={18} />} onClick={onEscalate} loading={busy === "escalate"} loadingText="Creando ticket…" disabled={busy !== null}>
                    Necesito más ayuda
                  </Button>
                  <p className="sgw-safe">
                    <Lock size={14} /> Tu reporte no se perderá. Si creas el ticket, tus datos, archivos
                    y los pasos que intentaste ({attempted.size}) pasan al técnico asignado.
                  </p>
                </>
              ) : phase === "empty" ? (
                <>
                  <Button fullWidth onClick={onEscalate} loading={busy === "escalate"} loadingText="Creando ticket…" icon={<ArrowRight size={18} />}>
                    Crear ticket ahora
                  </Button>
                  <Button variant="outlined" fullWidth leadingIcon={<Pencil size={16} />} onClick={onEdit} disabled={busy !== null}>
                    Editar mi reporte
                  </Button>
                </>
              ) : null}
            </div>
          </WebCard>

          <div className="sgw-engine">
            <span className="sgw-engine__dot" />
            <p>
              <strong>Motor de IA local activo</strong>
              Modelo ejecutado en el servidor interno · sin envío de datos al exterior
            </p>
          </div>
        </aside>
      </div>
    </WebShell>
  );
}
