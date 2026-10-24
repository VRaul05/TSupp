import type { CategoryId, Impact, Scope } from "../../services/ticketService";

/** Todo lo que el empleado va capturando en los 3 pasos. */
export interface RequestForm {
  category: CategoryId | null;
  subcategory: string;
  since: string;
  scope: Scope | null;
  errorMessage: string; // solo TI
  location: string;     // Edificio en móvil; todas las categorías en web
  impact: Impact | null; // solo web
  inventoryTag: string;  // solo web (opcional)
  title: string;
  description: string;
  files: File[];
}

export type FormErrors = Partial<Record<keyof RequestForm, string>>;

export const TITLE_MIN = 5;
export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;

/** Valida los campos obligatorios de cada paso. */
export function validateStep(step: number, form: RequestForm, web = false): FormErrors {
  const errors: FormErrors = {};

  if (step === 1 && !form.category) {
    errors.category = "Elige un tipo de problema.";
  }

  if (step === 2) {
    if (form.category !== "otro" && !form.subcategory) {
      errors.subcategory = "Selecciona una subcategoría.";
    }
    if (!form.since) errors.since = "Indica desde cuándo ocurre.";
    if (!form.scope) errors.scope = "Indica a quién afecta.";
    const needsLocation = web || form.category === "edificio";
    if (needsLocation && form.location.trim().length < 3) {
      errors.location = "Escribe dónde ocurre (edificio, piso o salón).";
    }
    if (web && !form.impact) errors.impact = "Indica el nivel de impacto.";
  }

  if (step === 3) {
    const title = form.title.trim();
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      errors.title = `El título debe tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.`;
    }
    if (form.description.trim().length < DESCRIPTION_MIN) {
      errors.description = `Describe el problema con al menos ${DESCRIPTION_MIN} caracteres.`;
    }
  }

  return errors;
}

/** Valida los 3 pasos juntos (versión web, todo en una página). */
export function validateAll(form: RequestForm): FormErrors {
  return { ...validateStep(1, form, true), ...validateStep(2, form, true), ...validateStep(3, form, true) };
}

/** ¿Qué pasos están completos? (para el indicador lateral de la versión web) */
export function completedSteps(form: RequestForm): boolean[] {
  return [1, 2, 3].map((step) => Object.keys(validateStep(step, form, true)).length === 0);
}
