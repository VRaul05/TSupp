import { useId } from "react";
import "./Toggle.css";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Interruptor de encendido/apagado con su texto. */
export function Toggle({ checked, onChange, label, description, disabled }: Props) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <label htmlFor={id}>{label}</label>
        {description && <p id={`${id}-desc`}>{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        className={`toggle ${checked ? "toggle--on" : ""}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
