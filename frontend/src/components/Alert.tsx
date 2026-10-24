import type { ReactNode } from "react";
import "./Alert.css";

interface AlertProps {
  tone: "error" | "warning";
  icon: ReactNode;
  children: ReactNode;
}

/** Mensaje destacado de error o advertencia. Se anuncia a lectores de pantalla. */
export function Alert({ tone, icon, children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="alert__icon">{icon}</span>
      <div className="alert__body">{children}</div>
    </div>
  );
}
