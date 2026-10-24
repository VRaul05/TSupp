import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

type Variant = "primary" | "outlined" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;      // ícono a la derecha
  leadingIcon?: ReactNode; // ícono a la izquierda
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "primary",
  icon,
  leadingIcon,
  fullWidth = false,
  loading = false,
  loadingText = "Cargando…",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn--${variant}`,
    fullWidth ? "btn--full" : "",
    className,
  ].join(" ");

  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {leadingIcon}
      <span>{loading ? loadingText : children}</span>
      {!loading && icon}
    </button>
  );
}
