import { Bot } from "lucide-react";
import { AiNote } from "../../components/AiNote";
import { EvidencePicker } from "./EvidencePicker";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  type FormErrors,
  type RequestForm,
} from "./types";

interface Props {
  form: RequestForm;
  errors: FormErrors;
  update: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
}

export function StepDescription({ form, errors, update }: Props) {
  return (
    <>
      <div className="request__intro">
        <h2>Describe el problema</h2>
        <p>Detalla los síntomas que observas y, si puedes, adjunta capturas o registros.</p>
      </div>

      <div className="request__field">
        <div className="request__label-row">
          <label className="request__label" htmlFor="title">
            Título <span className="request__req">*</span>
          </label>
          <span className="request__counter">
            {form.title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          id="title"
          className={`request__input ${errors.title ? "is-invalid" : ""}`}
          placeholder="Ej. No puedo conectar mi laptop a la red"
          value={form.title}
          maxLength={TITLE_MAX}
          onChange={(e) => update("title", e.target.value)}
          aria-describedby="title-hint"
        />
        {errors.title ? (
          <p className="request__error">{errors.title}</p>
        ) : (
          <p className="request__hint" id="title-hint">
            Entre {TITLE_MIN} y {TITLE_MAX} caracteres
          </p>
        )}
      </div>

      <div className="request__field">
        <div className="request__label-row">
          <label className="request__label" htmlFor="description">
            Descripción <span className="request__req">*</span>
          </label>
          <span className="request__counter">{form.description.length} caracteres</span>
        </div>
        <textarea
          id="description"
          className={`request__input request__textarea ${errors.description ? "is-invalid" : ""}`}
          placeholder="¿Qué pasó? ¿Desde cuándo? ¿Qué intentaste?"
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          onChange={(e) => update("description", e.target.value)}
          aria-describedby="description-hint"
        />
        {errors.description ? (
          <p className="request__error">{errors.description}</p>
        ) : (
          <p className="request__hint" id="description-hint">
            Mínimo {DESCRIPTION_MIN} caracteres
          </p>
        )}
      </div>

      <EvidencePicker files={form.files} onChange={(files) => update("files", files)} />

      <AiNote icon={<Bot size={16} />}>
        <p>
          <strong>IA local lista.</strong> Al enviar analizaremos tu reporte para sugerirte pasos
          de solución inmediata, sin enviar tus datos a servicios externos.
        </p>
      </AiNote>
    </>
  );
}
