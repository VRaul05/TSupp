import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CircleAlert, CircleCheck, Lock, RotateCcw, Sparkles, Ticket } from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { getSuggestions, type Suggestion } from "../../services/aiService";
import {
  escalateToTicket,
  getRequest,
  getRequestFiles,
  markResolvedBySelfService,
  type SupportRequest,
} from "../../services/ticketService";
import { LoadingState } from "./LoadingState";
import { NoSuggestionState } from "./NoSuggestionState";
import { SuggestionCard } from "./SuggestionCard";
import { useIsDesktop } from "../../components/useMediaQuery";
import { SuggestionsWeb } from "./SuggestionsWeb";
import "./SuggestionsPage.css";

type Phase = "loading" | "results" | "empty" | "error";

/**
 * Sugerencias de la IA (FR-06 / FR-07).
 * Estados: cargando → con sugerencias | sin sugerencia confiable | error.
 */
export function SuggestionsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState<SupportRequest | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("loading");
  const [stage, setStage] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [attempted, setAttempted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"resolve" | "escalate" | null>(null);
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const isDesktop = useIsDesktop();

  // 1. Cargar la solicitud
  useEffect(() => {
    getRequest(id).then(setRequest);
  }, [id]);

  // 2. Pedir sugerencias a la IA
  useEffect(() => {
    if (!request || request.status !== "autoservicio") return;
    let cancelled = false;
    setPhase("loading");
    setStage(0);

    getSuggestions(request, (i) => !cancelled && setStage(i))
      .then((result) => {
        if (cancelled) return;
        setSuggestions(result.suggestions);
        setPhase(result.suggestions.length > 0 ? "results" : "empty");
      })
      .catch(() => !cancelled && setPhase("error"));

    return () => {
      cancelled = true;
    };
  }, [request, retryKey]);

  // Si se recarga la página después de decidir, se manda al lugar correcto.
  if (request === null) return <Navigate to="/inicio" replace />;
  if (request?.status === "resuelta_autoservicio") {
    return <Navigate to={`/solicitud/${id}/resuelta`} replace />;
  }
  if (request?.status === "escalada" && request.ticketId) {
    return <Navigate to={`/tickets/${request.ticketId}/creado`} replace />;
  }

  function toggleAttempted(suggestionId: string) {
    setAttempted((prev) => {
      const next = new Set(prev);
      if (next.has(suggestionId)) next.delete(suggestionId);
      else next.add(suggestionId);
      return next;
    });
  }

  async function handleResolved() {
    setBusy("resolve");
    setActionError("");
    try {
      await markResolvedBySelfService(id);
      navigate(`/solicitud/${id}/resuelta`, { replace: true });
    } catch {
      setActionError("No pudimos guardar tu respuesta. Inténtalo de nuevo.");
      setBusy(null);
    }
  }

  async function handleEscalate() {
    setBusy("escalate");
    setActionError("");
    try {
      const ticket = await escalateToTicket(id, {
        suggestionIds: suggestions.map((s) => s.id),
        attemptedSteps: attempted.size,
      });
      navigate(`/tickets/${ticket.id}/creado`, { replace: true });
    } catch {
      setActionError("No pudimos crear el ticket. Revisa tu conexión e inténtalo de nuevo.");
      setBusy(null);
    }
  }

  function backToRequest() {
    if (!request) return;
    navigate("/nueva-solicitud", {
      state: { draft: request, draftFiles: getRequestFiles(request.id) },
    });
  }

  // ---------- Versión web ----------
  if (isDesktop) {
    return (
      <SuggestionsWeb
        request={request}
        phase={phase}
        stage={stage}
        suggestions={suggestions}
        attempted={attempted}
        onAttempted={(sid, value) =>
          setAttempted((prev) => {
            const next = new Set(prev);
            if (value) next.add(sid);
            else next.delete(sid);
            return next;
          })
        }
        busy={busy}
        actionError={actionError}
        onResolved={handleResolved}
        onEscalate={handleEscalate}
        onEdit={backToRequest}
        onRetry={() => setRetryKey((k) => k + 1)}
      />
    );
  }

  // ---------- Sin sugerencia confiable ----------
  if (phase === "empty") {
    return (
      <NoSuggestionState
        onCreateTicket={handleEscalate}
        onBack={backToRequest}
        creating={busy === "escalate"}
        error={actionError}
      />
    );
  }

  const loading = phase === "loading" || request === undefined;

  return (
    <div className="screen">
      <AppHeader
        title={loading ? "Mesa de Ayuda" : "Sugerencias"}
        onBack={() => navigate("/inicio")}
      />

      <main className="screen__content suggestions" aria-busy={loading}>
        {loading && (
          <p className="suggestions__status" role="status">
            <span className="suggestions__pulse" aria-hidden="true" />
            Analizando solicitud con IA local…
          </p>
        )}

        <div className="suggestions__intro">
          <h2>Sugerencias para tu problema</h2>
          {loading ? (
            <p>
              Estamos procesando los detalles para ofrecerte soluciones directas sin tener que
              abrir un ticket.
            </p>
          ) : (
            phase === "results" && (
              <p className="suggestions__disclaimer">
                <Sparkles size={14} />
                <span>
                  Generadas por IA con documentos autorizados ·{" "}
                  <strong>La IA solo recomienda</strong>, tú decides qué aplicar.
                </span>
              </p>
            )
          )}
        </div>

        {loading && <LoadingState stage={stage} />}

        {phase === "error" && (
          <Alert tone="error" icon={<CircleAlert size={18} />}>
            <p>El asistente no respondió. Puedes intentarlo de nuevo o crear el ticket directamente.</p>
            <button
              type="button"
              className="suggestions__retry"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              <RotateCcw size={14} /> Reintentar
            </button>
          </Alert>
        )}

        {phase === "results" && (
          <ol className="suggestions__list">
            {suggestions.map((suggestion, i) => (
              <li key={suggestion.id}>
                <SuggestionCard
                  suggestion={suggestion}
                  position={i + 1}
                  attempted={attempted.has(suggestion.id)}
                  onToggleAttempted={() => toggleAttempted(suggestion.id)}
                />
              </li>
            ))}
          </ol>
        )}

        {actionError && (
          <Alert tone="error" icon={<CircleAlert size={18} />}>
            <p>{actionError}</p>
          </Alert>
        )}
      </main>

      <footer className="screen__footer suggestions__footer">
        {phase !== "error" && (
          <Button
            fullWidth
            disabled={loading || busy !== null}
            loading={busy === "resolve"}
            loadingText="Guardando…"
            leadingIcon={<CircleCheck size={18} />}
            onClick={handleResolved}
          >
            Esto resolvió mi problema
          </Button>
        )}
        <Button
          variant={phase === "error" ? "primary" : "outlined"}
          fullWidth
          disabled={loading || busy !== null}
          loading={busy === "escalate"}
          loadingText="Creando ticket…"
          leadingIcon={phase === "error" ? <Ticket size={18} /> : undefined}
          onClick={handleEscalate}
        >
          {phase === "error" ? "Crear ticket" : "Necesito más ayuda"}
        </Button>
        <p className="suggestions__private">
          <Lock size={12} /> Procesamiento privado en red local
        </p>
      </footer>
    </div>
  );
}
