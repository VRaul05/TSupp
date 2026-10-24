import { Building2, CircleHelp, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { ChoiceCard } from "../../components/ChoiceCard";
import { CATEGORIES, type CategoryId } from "../../services/ticketService";
import type { RequestForm } from "./types";

const ICONS: Record<CategoryId, React.ReactNode> = {
  ti: <MonitorSmartphone size={22} />,
  edificio: <Building2 size={22} />,
  otro: <CircleHelp size={18} />,
};

interface Props {
  form: RequestForm;
  onCategory: (category: CategoryId) => void;
}

export function StepCategory({ form, onCategory }: Props) {
  return (
    <>
      <div className="request__intro">
        <h2>¿Qué tipo de problema tienes?</h2>
        <p>Selecciona una categoría para dirigir tu reporte al equipo adecuado.</p>
      </div>

      <fieldset className="request__group">
        <legend className="sr-only">Tipo de problema</legend>
        {CATEGORIES.map((category) => (
          <ChoiceCard
            key={category.id}
            name="category"
            value={category.id}
            checked={form.category === category.id}
            onChange={(value) => onCategory(value as CategoryId)}
            title={category.title}
            description={category.description}
            icon={ICONS[category.id]}
            muted={category.id === "otro"}
          />
        ))}
      </fieldset>

      <p className="request__badge">
        <ShieldCheck size={16} /> Asistente guiado con soporte local e IA segura
      </p>
    </>
  );
}
