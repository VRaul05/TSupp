import type { ReactNode } from "react";
import "./StatusChip.css";

interface StatusChipProps {
  children: ReactNode;
  tone?: "success" | "tertiary" | "neutral";
  icon?: ReactNode | null; // sin ícono → punto de color; null → nada
}

/** Pastilla pequeña de estado, ej. "IA local activa sin conexión". */
export function StatusChip({ children, tone = "success", icon }: StatusChipProps) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon === undefined ? <span className="chip__dot" aria-hidden="true" /> : icon}
      {children}
    </span>
  );
}
