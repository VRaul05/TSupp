import { useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, CircleAlert, Sparkles } from "lucide-react";

import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { StepHeader } from "../../components/StepHeader";
import { Alert } from "../../components/Alert";
import { createRequest, type CategoryId, type SupportRequest } from "../../services/ticketService";
import { StepCategory } from "./StepCategory";
import { StepDetails } from "./StepDetails";
import { StepDescription } from "./StepDescription";
import { validateAll, validateStep, type FormErrors, type RequestForm } from "./types";
import { useIsDesktop } from "../../components/useMediaQuery";
import { NewRequestWeb } from "./NewRequestWeb";
import { clearDraft } from "./draft";
import "./NewRequestPage.css";

const STEP_LABELS = ["Categorización", "Detalles del problema", "Descripción y evidencias"];
const FOOTER_LABELS = [
  "Paso 1: Clasificación inicial",
  "Paso 2: Diagnóstico asistido",
  "Paso 3: Evidencias",
];
const VALID_CATEGORIES: CategoryId[] = ["ti", "edificio", "otro"];

export function NewRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const contentRef = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();

  // Formas de llegar a esta pantalla:
  //  - Desde una tarjeta del inicio (?categoria=ti) → arranca en el paso 2.
  //  - Desde la búsqueda → el texto se usa como descripción.
  //  - Desde "Volver a mi solicitud" → se recupera todo y arranca en el paso 3.
  const navState = location.state as {
    description?: string;
    draft?: SupportRequest;
    draftFiles?: File[];
  } | null;
  const draft = navState?.draft;
  const presetCategory = params.get("categoria") as CategoryId | null;
  const validPreset = presetCategory && VALID_CATEGORIES.includes(presetCategory) ? presetCategory : null;
  const presetDescription = navState?.description ?? "";
  // ?sub=red → subcategoría ya elegida (desde el inicio web)
  const presetSub = params.get("sub") ?? "";

  const [step, setStep] = useState(draft ? 3 : validPreset ? 2 : 1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<RequestForm>(() =>
    draft
      ? {
          category: draft.category,
          subcategory: draft.subcategory ?? "",
          since: draft.since ?? "",
          scope: draft.scope ?? null,
          errorMessage: draft.errorMessage ?? "",
          location: draft.location ?? "",
          impact: draft.impact ?? null,
          inventoryTag: draft.inventoryTag ?? "",
          title: draft.title,
          description: draft.description,
          files: navState?.draftFiles ?? [],
        }
      : {
          category: validPreset,
          subcategory: validPreset && validPreset !== "otro" ? presetSub : "",
          since: "",
          scope: null,
          errorMessage: "",
          location: "",
          impact: null,
          inventoryTag: "",
          title: "",
          description: presetDescription,
          files: [],
        },
  );

  function update<K extends keyof RequestForm>(key: K, value: RequestForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Al corregir un campo se quita su error.
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function changeCategory(category: CategoryId) {
    // Al cambiar de categoría se reinicia la subcategoría (son listas distintas).
    setForm((prev) => ({
      ...prev,
      category,
      subcategory: prev.category === category ? prev.subcategory : "",
    }));
  }

  function goTo(nextStep: number) {
    setErrors({});
    setStep(nextStep);
    contentRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }

  const isDirty =
    form.title !== "" || form.description !== presetDescription || form.files.length > 0;

  function handleBack() {
    if (step > 1) {
      goTo(step - 1);
      return;
    }
    if (!isDirty || window.confirm("¿Salir sin enviar? Se perderá lo que capturaste.")) {
      navigate("/inicio");
    }
  }

  async function handleNext() {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      // Lleva la vista al primer campo con error.
      requestAnimationFrame(() => {
        document.querySelector(".is-invalid, .request__error")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    if (step < 3) {
      goTo(step + 1);
      return;
    }

    // Paso 3 → enviar
    await submitRequest(false);
  }

  /** Envía la solicitud (lo usan la versión móvil y la web). */
  async function submitRequest(web: boolean) {
    setSubmitting(true);
    setSubmitError("");
    try {
      const needsLocation = web || form.category === "edificio";
      const request = await createRequest({
        category: form.category!,
        subcategory: form.category === "otro" ? undefined : form.subcategory || undefined,
        since: form.since,
        scope: form.scope ?? undefined,
        errorMessage: form.category === "ti" ? form.errorMessage || undefined : undefined,
        location: needsLocation ? form.location.trim() : undefined,
        impact: form.impact ?? undefined,
        inventoryTag: form.inventoryTag.trim() || undefined,
        title: form.title,
        description: form.description,
        files: form.files,
      });
      clearDraft();
      // Primero la IA intenta resolverlo (FR-06); el ticket se crea solo si hace falta.
      navigate(`/solicitud/${request.id}/sugerencias`, { replace: true });
    } catch {
      setSubmitError("No se pudo enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  // ---------------- Versión web ----------------
  async function handleWebSubmit() {
    const all = validateAll(form);
    const clean = Object.fromEntries(Object.entries(all).filter(([, v]) => v)) as FormErrors;
    if (Object.keys(clean).length > 0) {
      setErrors(clean);
      requestAnimationFrame(() => {
        document.querySelector(".is-invalid, .request__error")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    await submitRequest(true);
  }

  if (isDesktop) {
    return (
      <NewRequestWeb
        form={form}
        errors={errors}
        update={update}
        onCategory={changeCategory}
        onSubmit={handleWebSubmit}
        onRestoreDraft={(saved) => setForm((prev) => ({ ...prev, ...saved, files: prev.files }))}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }

  return (
    <div className="screen">
      <AppHeader title="Nueva solicitud" onBack={handleBack} />
      <StepHeader step={step} total={3} label={STEP_LABELS[step - 1]} />

      <main className="screen__content request" ref={contentRef}>
        {step === 1 && <StepCategory form={form} onCategory={changeCategory} />}
        {step === 2 && <StepDetails form={form} errors={errors} update={update} />}
        {step === 3 && <StepDescription form={form} errors={errors} update={update} />}

        {submitError && (
          <Alert tone="error" icon={<CircleAlert size={18} />}>
            <p>{submitError}</p>
          </Alert>
        )}
      </main>

      <footer className="screen__footer request__footer">
        {step === 1 ? (
          <Button
            fullWidth
            disabled={!form.category}
            onClick={handleNext}
            icon={<ArrowRight size={18} />}
          >
            Siguiente
          </Button>
        ) : (
          <div className="request__actions">
            <Button
              variant="outlined"
              onClick={() => goTo(step - 1)}
              leadingIcon={step === 2 ? <ChevronLeft size={18} /> : undefined}
              disabled={submitting}
            >
              Atrás
            </Button>
            <Button
              onClick={handleNext}
              loading={submitting}
              loadingText="Enviando…"
              icon={step === 3 ? <Sparkles size={18} /> : <ArrowRight size={18} />}
            >
              {step === 3 ? "Enviar y ver sugerencias" : "Siguiente"}
            </Button>
          </div>
        )}
        <p className="request__footer-label">{FOOTER_LABELS[step - 1]}</p>
      </footer>
    </div>
  );
}
