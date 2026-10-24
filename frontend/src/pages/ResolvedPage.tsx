import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, CircleCheckBig, Hash, Send, ShieldCheck, Star } from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { getRequest, sendFeedback, type SupportRequest } from "../services/ticketService";
import "./ResolvedPage.css";

const RATING_LABELS = ["", "Nada útil", "Poco útil", "Útil", "Bastante útil", "Muy útil"];
const ASPECTS = ["Respuesta rápida", "Paso a paso claro", "Solución exacta", "Fácil de entender"];
const COMMENT_MAX = 200;

/** FR-08: resolución por autoservicio + calificación opcional. */
export function ResolvedPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [aspects, setAspects] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getRequest(id).then((r) => {
      if (!r) navigate("/inicio", { replace: true });
      setRequest(r);
      if (r?.feedback) setSent(true); // ya calificó antes
    });
  }, [id, navigate]);

  const shown = hover || rating;

  function toggleAspect(aspect: string) {
    setAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect],
    );
  }

  // Flechas izquierda/derecha para cambiar la calificación con teclado.
  function handleStarsKey(event: KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setRating((r) => Math.min(5, r + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setRating((r) => Math.max(1, r - 1));
    }
  }

  async function handleSend() {
    setSending(true);
    await sendFeedback(id, { rating, comment: comment.trim(), aspects });
    setSending(false);
    setSent(true);
    setTimeout(() => navigate("/inicio", { replace: true }), 1400);
  }

  return (
    <div className="screen">
      <AppHeader onBack={() => navigate("/inicio")} />

      <main className="screen__content outcome resolved">
        {request && (
          <span className="outcome__chip">
            <Hash size={13} /> Solicitud {request.id}
          </span>
        )}

        <div className="outcome__art outcome__art--success" aria-hidden="true">
          <CircleCheckBig size={52} />
        </div>

        <h2 className="outcome__title">¡Qué bueno que se resolvió!</h2>
        <p className="outcome__text">
          Tu solicitud se marcó como resuelta mediante autoservicio. No fue necesario crear un
          ticket.
        </p>
        <span className="resolved__badge">
          <Check size={13} strokeWidth={3} /> Resuelto
        </span>

        {sent ? (
          <section className="resolved__thanks" role="status">
            <strong>¡Gracias por tu calificación!</strong>
            <p>Nos ayuda a mejorar la atención para todos.</p>
          </section>
        ) : (
          <section className="rating" aria-labelledby="rating-title">
            <h3 id="rating-title">¿Qué tan útil fue la ayuda?</h3>
            <p className="rating__caption" aria-live="polite">
              {shown ? `${RATING_LABELS[shown]} (${shown} de 5 estrellas)` : "Toca una estrella"}
            </p>

            <div
              className="rating__stars"
              role="radiogroup"
              aria-labelledby="rating-title"
              onKeyDown={handleStarsKey}
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} de 5 estrellas: ${RATING_LABELS[value]}`}
                  tabIndex={rating === value || (rating === 0 && value === 1) ? 0 : -1}
                  className={`rating__star ${value <= shown ? "rating__star--on" : ""}`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHover(value)}
                >
                  <Star size={32} />
                </button>
              ))}
            </div>

            <div className="rating__comment">
              <div className="rating__comment-head">
                <label htmlFor="comment">
                  Comentario <span>(opcional)</span>
                </label>
                <span>
                  {comment.length}/{COMMENT_MAX}
                </span>
              </div>
              <textarea
                id="comment"
                rows={3}
                maxLength={COMMENT_MAX}
                placeholder="Escribe aquí cómo podemos seguir mejorando o qué fue lo más útil…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <fieldset className="rating__aspects">
              <legend>Aspectos destacados:</legend>
              <div>
                {ASPECTS.map((aspect) => {
                  const on = aspects.includes(aspect);
                  return (
                    <button
                      key={aspect}
                      type="button"
                      aria-pressed={on}
                      className={`rating__chip ${on ? "rating__chip--on" : ""}`}
                      onClick={() => toggleAspect(aspect)}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                      {aspect}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </section>
        )}

        <aside className="resolved__note">
          <span>
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>
              Mejora continua y local <em>Red interna</em>
            </strong>
            <p>
              Tu calificación se guarda en la red de la institución. El equipo técnico la revisa
              para mejorar las guías; nada se publica de forma automática.
            </p>
          </div>
        </aside>
      </main>

      {!sent && (
        <footer className="screen__footer outcome__footer">
          <Button
            fullWidth
            disabled={rating === 0}
            loading={sending}
            loadingText="Enviando…"
            leadingIcon={<Send size={18} />}
            onClick={handleSend}
          >
            Enviar calificación
          </Button>
          <button type="button" className="outcome__link" onClick={() => navigate("/inicio")}>
            Omitir y volver al inicio
          </button>
        </footer>
      )}
      {sent && (
        <footer className="screen__footer outcome__footer">
          <Button fullWidth onClick={() => navigate("/inicio")}>
            Ir al inicio
          </Button>
        </footer>
      )}
    </div>
  );
}
