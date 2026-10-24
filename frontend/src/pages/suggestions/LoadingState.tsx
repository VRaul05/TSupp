import { Sparkles } from "lucide-react";
import { ANALYSIS_STAGES } from "../../services/aiService";

/** Tarjeta animada + esqueletos mientras la IA analiza. */
export function LoadingState({ stage }: { stage: number }) {
  const current = ANALYSIS_STAGES[stage] ?? ANALYSIS_STAGES[0];
  const progress = ((stage + 1) / ANALYSIS_STAGES.length) * 100;

  return (
    <>
      <section className="analysis" aria-live="polite">
        <span className="analysis__icon">
          <Sparkles size={22} />
        </span>
        <div className="analysis__text">
          <strong>{current.title}</strong>
          <p>{current.detail}</p>
        </div>
        <div className="analysis__track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* Esqueletos con la forma de las tarjetas que van a llegar */}
      {[3, 2].map((rows, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-card__head">
            <span className="sk sk--title" />
            <span className="sk sk--pill" />
          </div>
          <span className="sk sk--sub" />
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="skeleton-card__row">
              <span className="sk sk--dot" />
              <span className="sk sk--line" style={{ width: `${80 - r * 12}%` }} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
