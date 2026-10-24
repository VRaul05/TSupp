import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./BottomSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Panel que sube desde abajo (en computadora se ve como ventana centrada).
 * Se cierra con la X, con Escape o tocando el fondo oscuro.
 */
export function BottomSheet({ open, onClose, title, icon, children, footer }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden"; // evita que la página se mueva detrás

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus(); // regresa el foco al botón que abrió el panel
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <span className="sheet__handle" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id={titleId}>
            {icon}
            {title}
          </h2>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
