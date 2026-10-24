import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./TextField.css";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;          // ícono dentro del campo (izquierda)
  labelAction?: ReactNode;   // algo a la derecha de la etiqueta (ej. "¿Olvidaste tu contraseña?")
  error?: boolean;
  trailing?: ReactNode;      // ícono extra a la derecha (ej. candado)
}

/**
 * Campo de texto reutilizable.
 * Si type="password" agrega automáticamente el botón de mostrar/ocultar.
 */
export function TextField({
  label,
  icon,
  labelAction,
  error = false,
  trailing,
  type = "text",
  id,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <div className="field__label-row">
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="field__control">
        {icon && <span className="field__icon">{icon}</span>}
        <input
          id={inputId}
          className="field__input"
          type={isPassword && visible ? "text" : type}
          aria-invalid={error}
          {...rest}
        />
        {trailing && <span className="field__icon field__icon--trailing">{trailing}</span>}
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            disabled={rest.disabled}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
