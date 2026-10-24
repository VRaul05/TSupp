import { ChevronDown, Sparkles } from "lucide-react";
import { ChoiceCard } from "../../components/ChoiceCard";
import { AiNote } from "../../components/AiNote";
import {
  SCOPE_OPTIONS,
  SINCE_OPTIONS,
  SUBCATEGORIES,
  type Scope,
} from "../../services/ticketService";
import { SubcategorySelect } from "./SubcategorySelect";
import type { FormErrors, RequestForm } from "./types";

interface Props {
  form: RequestForm;
  errors: FormErrors;
  update: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
}

export function StepDetails({ form, errors, update }: Props) {
  const isTI = form.category === "ti";
  const isBuilding = form.category === "edificio";

  return (
    <>
      <div className="request__intro">
        <h2>Cuéntanos más</h2>
        <p>
          Proporciona información adicional para que la IA y el equipo técnico atiendan tu
          reporte rápidamente.
        </p>
      </div>

      {(isTI || isBuilding) && (
        <SubcategorySelect
          options={SUBCATEGORIES[isTI ? "ti" : "edificio"]}
          value={form.subcategory}
          onChange={(value) => update("subcategory", value)}
          error={errors.subcategory}
        />
      )}

      {/* ¿Desde cuándo? — select nativo: en el celular abre el selector del sistema */}
      <div className="request__field">
        <label className="request__label" htmlFor="since">
          ¿Desde cuándo ocurre el problema? <span className="request__req">*</span>
        </label>
        <div className="native-select">
          <select
            id="since"
            value={form.since}
            onChange={(e) => update("since", e.target.value)}
            className={errors.since ? "is-invalid" : ""}
          >
            <option value="" disabled>
              Seleccionar tiempo (ej. Hoy, Hace unos minutos)
            </option>
            {SINCE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <ChevronDown size={18} />
        </div>
        {errors.since && <p className="request__error">{errors.since}</p>}
      </div>

      {/* ¿A quién afecta? */}
      <fieldset className="request__field request__fieldset">
        <legend className="request__label">
          ¿Afecta solo a tu equipo o a más personas? <span className="request__req">*</span>
        </legend>
        <div className="request__group request__group--tight">
          {SCOPE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.id}
              compact
              name="scope"
              value={option.id}
              checked={form.scope === option.id}
              onChange={(value) => update("scope", value as Scope)}
              title={option.label}
            />
          ))}
        </div>
        {errors.scope && <p className="request__error">{errors.scope}</p>}
      </fieldset>

      {/* Pregunta específica de la categoría (FR-05) */}
      {isTI && (
        <div className="request__field">
          <label className="request__label" htmlFor="error-message">
            ¿Qué mensaje de error ves? <span className="request__optional">(Opcional)</span>
          </label>
          <input
            id="error-message"
            className="request__input"
            placeholder="Ej. Código ERR_NETWORK_TIMED_OUT o pantalla azul"
            value={form.errorMessage}
            onChange={(e) => update("errorMessage", e.target.value)}
            maxLength={200}
          />
        </div>
      )}

      {isBuilding && (
        <div className="request__field">
          <label className="request__label" htmlFor="location">
            ¿Dónde ocurre? <span className="request__req">*</span>
          </label>
          <input
            id="location"
            className={`request__input ${errors.location ? "is-invalid" : ""}`}
            placeholder="Ej. Edificio A, piso 3, sala de juntas"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            maxLength={120}
          />
          {errors.location && <p className="request__error">{errors.location}</p>}
        </div>
      )}

      <AiNote icon={<Sparkles size={14} />}>
        <p>
          <strong>IA local:</strong>{" "}
          {isTI
            ? "tus respuestas nos permiten sugerirte pruebas de conexión y soluciones rápidas antes de crear el ticket."
            : isBuilding
              ? "con la ubicación y el tipo de falla dirigimos tu reporte al equipo de mantenimiento correcto."
              : "un supervisor revisará tu reporte y lo asignará al equipo adecuado."}
        </p>
      </AiNote>
    </>
  );
}
