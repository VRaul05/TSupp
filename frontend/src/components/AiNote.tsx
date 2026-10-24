import type { ReactNode } from "react";
import "./AiNote.css";

/** Recuadro rosa con información sobre el asistente de IA local. */
export function AiNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <aside className="ai-note">
      <span className="ai-note__icon">{icon}</span>
      <div>{children}</div>
    </aside>
  );
}
