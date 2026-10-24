import type { ReactNode } from "react";
import "./ChoiceCard.css";

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
  muted?: boolean;
}

/**
 * Opción tipo tarjeta con radio (una sola elección).
 * Se usa en "¿Qué tipo de problema tienes?" y en "¿A quién afecta?".
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  compact = false,
  muted = false,
}: ChoiceCardProps) {
  const classes = [
    "choice",
    checked ? "choice--checked" : "",
    compact ? "choice--compact" : "",
    muted ? "choice--muted" : "",
  ].join(" ");

  return (
    <label className={classes}>
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      {icon && <span className="choice__icon">{icon}</span>}
      <span className="choice__text">
        <span className="choice__title">{title}</span>
        {description && <span className="choice__desc">{description}</span>}
      </span>
      <span className="choice__radio" aria-hidden="true" />
    </label>
  );
}
