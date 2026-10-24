import { useEffect, useState } from "react";
import { CircleCheck, FileLock2, Send } from "lucide-react";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { ARCO_LABEL, submitArcoRequest, type ArcoRight } from "../../services/notificationService";

const MIN_DETAIL = 15;

/** Solicitud de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición). */
export function ArcoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [right, setRight] = useState<ArcoRight | null>(null);
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [folio, setFolio] = useState("");

  useEffect(() => {
    if (open) {
      setRight(null);
      setDetail("");
      setFolio("");
    }
  }, [open]);

  const valid = right !== null && detail.trim().length >= MIN_DETAIL;

  async function submit() {
    if (!right) return;
    setSending(true);
    setFolio(await submitArcoRequest(right, detail));
    setSending(false);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={folio ? "Solicitud enviada" : "Mis derechos ARCO"}
      icon={<FileLock2 size={20} />}
      footer={
        folio ? (
          <Button fullWidth onClick={onClose} className="arco__full">
            Entendido
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!valid} loading={sending} loadingText="Enviando…" leadingIcon={<Send size={16} />}>
              Enviar
            </Button>
          </>
        )
      }
    >
      {folio ? (
        <div className="arco__done" role="status">
          <CircleCheck size={40} />
          <p>
            Registramos tu solicitud con el folio <strong>{folio}</strong>.
          </p>
          <p>La Unidad de Transparencia de la institución la revisará y te responderá por correo.</p>
        </div>
      ) : (
        <>
          <p className="sheet-text">Elige qué quieres hacer con tus datos personales:</p>
          <div className="arco__options" role="radiogroup" aria-label="Tipo de solicitud">
            {(Object.keys(ARCO_LABEL) as ArcoRight[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={right === key}
                className={`arco__option ${right === key ? "arco__option--on" : ""}`}
                onClick={() => setRight(key)}
              >
                <strong>{ARCO_LABEL[key].title}</strong>
                <span>{ARCO_LABEL[key].help}</span>
              </button>
            ))}
          </div>
          <label className="arco__label" htmlFor="arco-detail">
            Describe tu solicitud <span className="request__req">*</span>
          </label>
          <textarea
            id="arco-detail"
            className="sheet-textarea"
            rows={3}
            maxLength={600}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Ej. Mi área de adscripción aparece incorrecta; debe decir Dirección de Finanzas."
          />
          <p className="arco__hint">Mínimo {MIN_DETAIL} caracteres.</p>
        </>
      )}
    </BottomSheet>
  );
}
