import { Bot, CircleAlert, Cpu, Lock, Ticket, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";

interface Props {
  onCreateTicket: () => void;
  onBack: () => void;
  creating: boolean;
  error: string;
}

/** La IA no encontró nada confiable → se ofrece crear el ticket. */
export function NoSuggestionState({ onCreateTicket, onBack, creating, error }: Props) {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <AppHeader onBack={() => navigate("/inicio")} />

      <main className="screen__content outcome">
        <span className="outcome__chip">
          <Cpu size={13} /> La IA local analizó tu problema
        </span>

        <div className="outcome__art outcome__art--neutral" aria-hidden="true">
          <Bot size={44} />
          <span className="outcome__art-badge">?</span>
        </div>

        <h2 className="outcome__title">No encontré una sugerencia confiable</h2>
        <p className="outcome__text">Un técnico podrá ayudarte con tu problema.</p>

        <div className="outcome__info">
          <span className="outcome__info-icon">
            <UserCheck size={18} />
          </span>
          <div>
            <strong>Atención personalizada garantizada</strong>
            <p>
              Tu reporte será clasificado y asignado al equipo técnico especializado para
              resolverlo con prontitud.
            </p>
          </div>
        </div>

        {error && (
          <Alert tone="error" icon={<CircleAlert size={18} />}>
            <p>{error}</p>
          </Alert>
        )}
      </main>

      <footer className="screen__footer outcome__footer">
        <Button
          fullWidth
          leadingIcon={<Ticket size={18} />}
          onClick={onCreateTicket}
          loading={creating}
          loadingText="Creando ticket…"
        >
          Crear ticket ahora
        </Button>
        <Button variant="outlined" fullWidth onClick={onBack} disabled={creating}>
          Volver a mi solicitud
        </Button>
        <p className="outcome__note">
          <Lock size={12} /> Tu descripción y evidencia se enviarán con el ticket.
        </p>
      </footer>
    </div>
  );
}
