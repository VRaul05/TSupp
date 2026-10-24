import { useId, useState } from "react";
import { BookOpen, Check, ChevronDown, CircleCheck, TriangleAlert, CircleHelp } from "lucide-react";
import type { Confidence, Suggestion } from "../../services/aiService";

const CONFIDENCE: Record<Confidence, { label: string; icon: React.ReactNode }> = {
  alta: { label: "Confianza: Alta", icon: <CircleCheck size={13} /> },
  media: { label: "Confianza: Media", icon: <TriangleAlert size={13} /> },
  baja: { label: "Confianza: Baja", icon: <CircleHelp size={13} /> },
};

/** Convierte `texto` en <code>texto</code> para los comandos. */
function renderStep(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

interface Props {
  suggestion: Suggestion;
  position: number;
  attempted: boolean;
  onToggleAttempted: () => void;
}

export function SuggestionCard({ suggestion, position, attempted, onToggleAttempted }: Props) {
  const [showSource, setShowSource] = useState(false);
  const sourceId = useId();
  const confidence = CONFIDENCE[suggestion.confidence];

  return (
    <article className={`sg-card ${attempted ? "sg-card--attempted" : ""}`} aria-label={`Sugerencia ${position}`}>
      <h3 className="sg-card__title">{suggestion.title}</h3>
      <span className={`sg-card__confidence sg-card__confidence--${suggestion.confidence}`}>
        {confidence.icon} {confidence.label}
      </span>

      <p className="sg-card__label">Instrucciones paso a paso:</p>
      <ol className="sg-card__steps">
        {suggestion.steps.map((step, i) => (
          <li key={i}>
            <span className="sg-card__num">{i + 1}</span>
            <span>{renderStep(step)}</span>
          </li>
        ))}
      </ol>

      <div className="sg-card__footer">
        <button
          type="button"
          className="sg-card__source-btn"
          aria-expanded={showSource}
          aria-controls={sourceId}
          onClick={() => setShowSource((v) => !v)}
        >
          <BookOpen size={14} /> Ver fuente
          <ChevronDown size={14} className={showSource ? "is-open" : ""} />
        </button>

        <button
          type="button"
          className={`sg-card__tried ${attempted ? "sg-card__tried--on" : ""}`}
          aria-pressed={attempted}
          onClick={onToggleAttempted}
        >
          <span className="sg-card__tried-box">{attempted && <Check size={12} strokeWidth={3} />}</span>
          Ya lo intenté
        </button>
      </div>

      {showSource && (
        <dl className="sg-card__source" id={sourceId}>
          <div>
            <dt>Documento</dt>
            <dd>{suggestion.source.title}</dd>
          </div>
          <div>
            <dt>Clave</dt>
            <dd>
              {suggestion.source.docId} · {suggestion.source.section}
            </dd>
          </div>
          <div>
            <dt>Relevancia</dt>
            <dd>
              <span className="sg-card__relevance">
                <span style={{ width: `${Math.round(suggestion.source.relevance * 100)}%` }} />
              </span>
              {Math.round(suggestion.source.relevance * 100)}%
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
