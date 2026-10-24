import { Headset, Sparkles } from "lucide-react";
import "./BrandMark.css";

/** Logo de la Mesa de Ayuda con el distintivo de IA. */
export function BrandMark({ showAiBadge = true }: { showAiBadge?: boolean }) {
  return (
    <div className="brand-mark" aria-hidden="true">
      <Headset size={32} strokeWidth={2} />
      {showAiBadge && (
        <span className="brand-mark__badge">
          <Sparkles size={11} strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}
