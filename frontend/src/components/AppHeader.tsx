import type { ReactNode } from "react";
import { ArrowLeft, CircleHelp } from "lucide-react";
import "./AppHeader.css";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onHelp?: () => void;
  /** Botón que reemplaza al de ayuda (ej. "marcar todas como leídas"). */
  action?: ReactNode;
}

/** Barra superior con botón de regresar, título y ayuda. */
export function AppHeader({ title = "Mesa de Ayuda", subtitle, onBack, onHelp, action }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__icon"
        onClick={onBack}
        aria-label="Regresar"
        disabled={!onBack}
      >
        <ArrowLeft size={20} />
      </button>
      <div className="app-header__titles">
        <h1 className="app-header__title">{title}</h1>
        {subtitle && <p className="app-header__subtitle">{subtitle}</p>}
      </div>
      {action ?? (
        <button type="button" className="app-header__icon" onClick={onHelp} aria-label="Ayuda">
          <CircleHelp size={20} />
        </button>
      )}
    </header>
  );
}
