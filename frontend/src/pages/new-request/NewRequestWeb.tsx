import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock,
  Cpu,
  Lock,
  MapPin,
  Monitor,
  QrCode,
  Save,
  Sparkles,
  X,
} from "lucide-react";

import { WebShell, WebCard } from "../../components/web/WebShell";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ChoiceCard } from "../../components/ChoiceCard";
import {
  CATEGORIES,
  ESTIMATES,
  IMPACT_LABEL,
  IMPACT_OPTIONS,
  SCOPE_OPTIONS,
  SINCE_OPTIONS,
  SUBCATEGORIES,
  categoryLabel,
  formatFileSize,
  type CategoryId,
  type Impact,
  type Scope,
} from "../../services/ticketService";
import { EvidencePicker } from "./EvidencePicker";
import { SubcategorySelect } from "./SubcategorySelect";
import { loadDraft, saveDraft, clearDraft, type SavedDraft } from "./draft";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  completedSteps,
  type FormErrors,
  type RequestForm,
} from "./types";
import "./NewRequestWeb.css";

const CATEGORY_ICONS: Record<CategoryId, React.ReactNode> = {
  ti: <Monitor size={20} />,
  edificio: <Building2 size={20} />,
  otro: <CircleHelp size={20} />,
};

const CATEGORY_SHORT: Record<CategoryId, string> = {
  ti: "Redes, cuentas, equipo, software, licencias y VPN",
  edificio: "Climatización, electricidad, mobiliario y cerrajería",
  otro: "Un supervisor clasificará tu solicitud manualmente",
};

const STEPS = [
  { title: "Tipo de problema", hint: "Categoría general" },
  { title: "Detalles", hint: "Subcategoría y preguntas guía" },
  { title: "Descripción y evidencia", hint: "Detalles y archivos adjuntos" },
];

interface Props {
  form: RequestForm;
  errors: FormErrors;
  update: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
  onCategory: (category: CategoryId) => void;
  onSubmit: () => void;
  onRestoreDraft: (draft: SavedDraft) => void;
  submitting: boolean;
  submitError: string;
}

/** "Crear nueva solicitud de soporte" — versión web, todo en una página. */
export function NewRequestWeb({
  form,
  errors,
  update,
  onCategory,
  onSubmit,
  onRestoreDraft,
  submitting,
  submitError,
}: Props) {
  const done = completedSteps(form);
  const currentStep = done.findIndex((d) => !d); // -1 = todo listo
  const [draft, setDraft] = useState<SavedDraft | null>(() => {
    const saved = loadDraft();
    // Solo ofrece recuperar si el formulario está vacío.
    return saved && !form.title && !form.description ? saved : null;
  });
  const [savedAt, setSavedAt] = useState("");

  const isTI = form.category === "ti";
  const hasSubcats = form.category === "ti" || form.category === "edificio";
  const totalSize = form.files.reduce((sum, f) => sum + f.size, 0);

  function handleSaveDraft() {
    const saved = saveDraft(form);
    setSavedAt(new Date(saved.savedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
  }

  const stepBadge = (i: number) => (
    <span className={`nrw-step-tag ${done[i] ? "nrw-step-tag--done" : ""}`}>
      {done[i] ? <Check size={12} strokeWidth={3} /> : null} Paso {i + 1}
    </span>
  );

  return (
    <WebShell>
      <nav className="nrw-crumbs" aria-label="Ruta">
        <Link to="/inicio">Inicio</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Nueva solicitud</span>
      </nav>

      <header className="nrw-head">
        <div>
          <h1>Crear nueva solicitud de soporte</h1>
          <p>Completa las secciones para recibir sugerencias inteligentes o asignación técnica.</p>
        </div>
        <span className="nrw-ai-chip">
          <span aria-hidden="true" /> IA local lista
        </span>
      </header>

      {draft && (
        <div className="nrw-draft" role="status">
          <Save size={16} />
          <span>
            Tienes un borrador guardado el{" "}
            {new Date(draft.savedAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            .
          </span>
          <button
            type="button"
            onClick={() => {
              onRestoreDraft(draft);
              setDraft(null);
            }}
          >
            Recuperar
          </button>
          <button
            type="button"
            className="nrw-draft__discard"
            onClick={() => {
              clearDraft();
              setDraft(null);
            }}
            aria-label="Descartar borrador"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="nrw">
        {/* ---------- Columna izquierda: pasos ---------- */}
        <aside className="nrw-left">
          <WebCard className="nrw-steps">
            <div className="nrw-steps__head">
              <h2>Pasos de la solicitud</h2>
              <span>
                {currentStep === -1 ? "Listo" : `Paso ${currentStep + 1} de 3`}
              </span>
            </div>
            <ol>
              {STEPS.map((step, i) => {
                const state = done[i] ? "done" : i === currentStep ? "current" : "todo";
                return (
                  <li key={step.title} className={`nrw-steps__item nrw-steps__item--${state}`}>
                    <a href={`#seccion-${i + 1}`}>
                      <span className="nrw-steps__dot">
                        {done[i] ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </span>
                      <span>
                        <strong>
                          {i + 1}. {step.title}
                        </strong>
                        <small>{step.hint}</small>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </WebCard>

          <div className="nrw-privacy">
            <Lock size={16} />
            <p>
              <strong>Privacidad institucional</strong>
              Tus datos se procesan con IA local dentro de la red de la institución. No se comparte
              información con servicios externos.
            </p>
          </div>
        </aside>

        {/* ---------- Centro: formulario ---------- */}
        <div className="nrw-center">
          {/* 1. Tipo de problema */}
          <WebCard className="nrw-section">
            <div className="nrw-section__head" id="seccion-1">
              <h2>
                <span className="nrw-num">1</span> Tipo de problema
              </h2>
              {stepBadge(0)}
            </div>
            <p className="request__label">¿Qué tipo de problema deseas reportar?</p>
            <div className="nrw-tiles" role="radiogroup" aria-label="Tipo de problema">
              {CATEGORIES.map((cat) => {
                const on = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`nrw-tile ${on ? "nrw-tile--on" : ""}`}
                    onClick={() => onCategory(cat.id)}
                  >
                    <span className="nrw-tile__top">
                      <span className="nrw-tile__icon">{CATEGORY_ICONS[cat.id]}</span>
                      <span className="nrw-tile__radio">{on && <Check size={12} strokeWidth={3} />}</span>
                    </span>
                    <strong>{cat.title}</strong>
                    <small>{CATEGORY_SHORT[cat.id]}</small>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="request__error">{errors.category}</p>}
          </WebCard>

          {/* 2. Detalles */}
          <WebCard className={`nrw-section ${!form.category ? "nrw-section--locked" : ""}`}>
            <div className="nrw-section__head" id="seccion-2">
              <h2>
                <span className="nrw-num">2</span> Detalles de la solicitud
              </h2>
              {stepBadge(1)}
            </div>

            {!form.category ? (
              <p className="nrw-locked">Elige primero el tipo de problema.</p>
            ) : (
              <div className="nrw-fields">
                {hasSubcats && (
                  <div>
                    <SubcategorySelect
                      options={SUBCATEGORIES[form.category as "ti" | "edificio"]}
                      value={form.subcategory}
                      onChange={(v) => update("subcategory", v)}
                      error={errors.subcategory}
                    />
                    <p className="request__hint">
                      Sirve para dirigir tu solicitud al equipo técnico correcto.
                    </p>
                  </div>
                )}

                <div className="request__field">
                  <label className="request__label" htmlFor="web-location">
                    ¿En qué sede o edificio te encuentras? <span className="request__req">*</span>
                  </label>
                  <div className={`nrw-input-icon ${errors.location ? "is-invalid" : ""}`}>
                    <input
                      id="web-location"
                      className="request__input"
                      placeholder="Ej. Oficinas centrales, Edificio A, piso 3"
                      value={form.location}
                      maxLength={120}
                      onChange={(e) => update("location", e.target.value)}
                    />
                    <MapPin size={18} />
                  </div>
                  {errors.location && <p className="request__error">{errors.location}</p>}
                </div>

                <fieldset className="request__field request__fieldset">
                  <legend className="request__label">
                    ¿Qué nivel de impacto tiene en tu trabajo? <span className="request__req">*</span>
                  </legend>
                  <div className="request__group request__group--tight">
                    {IMPACT_OPTIONS.map((option) => (
                      <ChoiceCard
                        key={option.id}
                        compact
                        name="impact"
                        value={option.id}
                        checked={form.impact === option.id}
                        onChange={(v) => update("impact", v as Impact)}
                        title={option.label}
                        description={option.description}
                        icon={<span className={`nrw-impact-dot nrw-impact-dot--${option.id}`} />}
                      />
                    ))}
                  </div>
                  {errors.impact && <p className="request__error">{errors.impact}</p>}
                </fieldset>

                <div className="nrw-two">
                  <div className="request__field">
                    <label className="request__label" htmlFor="web-since">
                      ¿Desde cuándo ocurre? <span className="request__req">*</span>
                    </label>
                    <div className="native-select">
                      <select
                        id="web-since"
                        value={form.since}
                        onChange={(e) => update("since", e.target.value)}
                        className={errors.since ? "is-invalid" : ""}
                      >
                        <option value="" disabled>
                          Seleccionar tiempo
                        </option>
                        {SINCE_OPTIONS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} />
                    </div>
                    {errors.since && <p className="request__error">{errors.since}</p>}
                  </div>

                  <div className="request__field">
                    <label className="request__label" htmlFor="web-scope">
                      ¿A quién afecta? <span className="request__req">*</span>
                    </label>
                    <div className="native-select">
                      <select
                        id="web-scope"
                        value={form.scope ?? ""}
                        onChange={(e) => update("scope", e.target.value as Scope)}
                        className={errors.scope ? "is-invalid" : ""}
                      >
                        <option value="" disabled>
                          Seleccionar
                        </option>
                        {SCOPE_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} />
                    </div>
                    {errors.scope && <p className="request__error">{errors.scope}</p>}
                  </div>
                </div>

                <div className="request__field">
                  <div className="request__label-row">
                    <label className="request__label" htmlFor="web-inventory">
                      Número de inventario o placa del equipo{" "}
                      <span className="request__optional">(opcional)</span>
                    </label>
                    <span className="request__hint">Etiqueta plateada en el reverso</span>
                  </div>
                  <div className="nrw-input-icon nrw-input-icon--left">
                    <QrCode size={18} />
                    <input
                      id="web-inventory"
                      className="request__input"
                      placeholder="Ej. LPT-2023-8841"
                      value={form.inventoryTag}
                      maxLength={40}
                      onChange={(e) => update("inventoryTag", e.target.value)}
                    />
                  </div>
                </div>

                {isTI && (
                  <div className="request__field">
                    <label className="request__label" htmlFor="web-error">
                      ¿Qué mensaje de error ves? <span className="request__optional">(opcional)</span>
                    </label>
                    <input
                      id="web-error"
                      className="request__input"
                      placeholder="Ej. Código ERR_NETWORK_TIMED_OUT"
                      value={form.errorMessage}
                      maxLength={200}
                      onChange={(e) => update("errorMessage", e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </WebCard>

          {/* 3. Descripción y evidencia */}
          <WebCard className="nrw-section">
            <div className="nrw-section__head" id="seccion-3">
              <h2>
                <span className="nrw-num">3</span> Descripción y evidencia
              </h2>
              {stepBadge(2)}
            </div>
            <div className="nrw-fields">
              <div className="request__field">
                <div className="request__label-row">
                  <label className="request__label" htmlFor="web-title">
                    Título del problema <span className="request__req">*</span>
                  </label>
                  <span className="request__counter">
                    {form.title.length} / {TITLE_MAX} caracteres
                  </span>
                </div>
                <input
                  id="web-title"
                  className={`request__input ${errors.title ? "is-invalid" : ""}`}
                  placeholder="Ej. Falla intermitente en conexión Wi-Fi en sala 3B"
                  value={form.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => update("title", e.target.value)}
                />
                {errors.title ? (
                  <p className="request__error">{errors.title}</p>
                ) : (
                  <p className="request__hint">
                    Entre {TITLE_MIN} y {TITLE_MAX} caracteres. Resume el problema de forma clara.
                  </p>
                )}
              </div>

              <div className="request__field">
                <div className="request__label-row">
                  <label className="request__label" htmlFor="web-description">
                    Descripción detallada <span className="request__req">*</span>
                  </label>
                  <span className="request__counter">{form.description.length} caracteres</span>
                </div>
                <textarea
                  id="web-description"
                  className={`request__input request__textarea ${errors.description ? "is-invalid" : ""}`}
                  rows={5}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="¿Qué estabas haciendo? ¿Qué mensaje apareció? ¿Qué intentaste?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
                {errors.description ? (
                  <p className="request__error">{errors.description}</p>
                ) : (
                  <p className="request__hint">
                    Mínimo {DESCRIPTION_MIN} caracteres. Describe qué estabas haciendo y los mensajes
                    de error.
                  </p>
                )}
              </div>

              <EvidencePicker files={form.files} onChange={(f) => update("files", f)} dropzone />
            </div>
          </WebCard>
        </div>

        {/* ---------- Derecha: resumen ---------- */}
        <aside className="nrw-right">
          <WebCard className="nrw-summary">
            <div className="nrw-summary__head">
              <h2>Resumen previo</h2>
              <span>En borrador</span>
            </div>
            <dl>
              <div>
                <dt>Categoría:</dt>
                <dd>{form.category ? CATEGORIES.find((c) => c.id === form.category)?.title : "—"}</dd>
              </div>
              {hasSubcats && (
                <div>
                  <dt>Subcategoría:</dt>
                  <dd>{form.subcategory ? categoryLabel(form.category!, form.subcategory) : "—"}</dd>
                </div>
              )}
              <div>
                <dt>Ubicación:</dt>
                <dd>{form.location.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Impacto:</dt>
                <dd>
                  {form.impact ? (
                    <span className={`nrw-impact nrw-impact--${form.impact}`}>
                      {form.impact === "bloqueante" && <CircleAlert size={12} />}
                      {IMPACT_LABEL[form.impact]}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Archivos adjuntos:</dt>
                <dd>
                  {form.files.length === 0
                    ? "Ninguno"
                    : `${form.files.length} archivo${form.files.length > 1 ? "s" : ""} (${formatFileSize(totalSize)})`}
                </dd>
              </div>
            </dl>

            <div className="nrw-eta">
              <Clock size={16} />
              <p>
                <strong>Tiempo de atención</strong>
                {form.category
                  ? `Respuesta estimada: ${ESTIMATES[form.category].toLowerCase()} si se crea un ticket.`
                  : "Elige una categoría para ver el tiempo estimado."}
              </p>
            </div>

            {submitError && (
              <Alert tone="error" icon={<CircleAlert size={16} />}>
                <p>{submitError}</p>
              </Alert>
            )}

            <Button
              fullWidth
              onClick={onSubmit}
              loading={submitting}
              loadingText="Enviando…"
              icon={<Sparkles size={18} />}
            >
              Enviar y ver sugerencias
            </Button>
            <Button variant="outlined" fullWidth leadingIcon={<Save size={16} />} onClick={handleSaveDraft} disabled={submitting}>
              Guardar borrador
            </Button>
            {savedAt && (
              <p className="nrw-saved" role="status">
                <Check size={13} /> Borrador guardado a las {savedAt} (sin archivos).
              </p>
            )}
            <p className="nrw-summary__note">
              <Cpu size={13} /> Al enviar, el asistente de IA local buscará soluciones antes de
              asignar a un técnico.
            </p>
          </WebCard>
        </aside>
      </div>
    </WebShell>
  );
}
