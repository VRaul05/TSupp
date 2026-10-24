import { Link, useParams } from "react-router-dom";
import { CircleCheckBig, House, Sparkles } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { AiNote } from "../components/AiNote";
import "./RequestSentPage.css";

/**
 * Confirmación temporal después de enviar.
 * TODO: aquí entrará la pantalla de "Sugerencias de la IA" (FR-06),
 * cuando tengamos su diseño.
 */
export function RequestSentPage() {
  const { id } = useParams();

  return (
    <div className="screen">
      <AppHeader title="Solicitud enviada" />
      <main className="screen__content sent">
        <span className="sent__icon">
          <CircleCheckBig size={40} />
        </span>
        <h2>¡Recibimos tu solicitud!</h2>
        <p>
          Tu número de seguimiento es <strong>#{id}</strong>. Te avisaremos cuando cambie de
          estado.
        </p>

        <AiNote icon={<Sparkles size={14} />}>
          <p>
            <strong>Próximamente:</strong> aquí verás las sugerencias de la IA para intentar
            resolverlo tú mismo antes de que llegue un técnico.
          </p>
        </AiNote>

        <Link to="/inicio" className="sent__home">
          <House size={18} /> Volver al inicio
        </Link>
      </main>
    </div>
  );
}
