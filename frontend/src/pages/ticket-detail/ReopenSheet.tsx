import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleHelp, ImagePlus, Info, Paperclip, Send, X, Zap } from "lucide-react";
import { BottomSheet } from "../../components/BottomSheet";
import { Button } from "../../components/Button";
import { formatFileSize, validateFile } from "../../services/ticketService";

const MIN_REASON = 10;

interface Props {
  open: boolean;
  technicianName?: string;
  onClose: () => void;
  onSubmit: (reason: string, files: File[]) => Promise<void>;
}

/** "¿Por qué no se resolvió?" — motivo obligatorio y captura opcional. */
export function ReopenSheet({ open, technicianName, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setFile(null);
      setError("");
      setTouched(false);
    }
  }, [open]);

  const tooShort = reason.trim().length < MIN_REASON;

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    const problem = validateFile(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setFile(picked);
  }

  async function submit() {
    setTouched(true);
    if (tooShort) return;
    setSending(true);
    try {
      await onSubmit(reason, file ? [file] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reabrir. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="¿Por qué no se resolvió?"
      icon={<CircleHelp size={20} />}
      footer={
        <div className="reopen__actions">
          <Button fullWidth onClick={submit} loading={sending} loadingText="Reabriendo…" leadingIcon={<Send size={16} />}>
            Enviar y reabrir ticket
          </Button>
          <button type="button" className="outcome__link" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
        </div>
      }
    >
      <p className="sheet-text">
        Cuéntale al equipo técnico qué sigue fallando para reabrir y continuar atendiendo tu caso de
        inmediato.
      </p>

      <div className="reopen__field">
        <div className="reopen__label-row">
          <label htmlFor="reopen-reason">
            ¿Por qué no se resolvió? <span className="request__req">*</span>
          </label>
          <span>Mínimo {MIN_REASON} caracteres</span>
        </div>
        <textarea
          id="reopen-reason"
          className={`sheet-textarea ${touched && tooShort ? "is-invalid" : ""}`}
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. Sigue apareciendo el mismo error al intentar imprimir…"
          aria-describedby="reopen-hint"
        />
        <p id="reopen-hint" className={`reopen__hint ${touched && tooShort ? "reopen__hint--error" : ""}`}>
          <Info size={13} />
          {touched && tooShort
            ? `Escribe al menos ${MIN_REASON} caracteres (llevas ${reason.trim().length}).`
            : "Describe qué ocurre al intentarlo de nuevo."}
        </p>
      </div>

      <div className="reopen__field">
        <span className="reopen__label">
          Adjuntar nueva captura <span className="request__optional">(opcional)</span>
        </span>
        {file ? (
          <div className="reopen__file">
            <Paperclip size={16} />
            <span>
              <strong>{file.name}</strong>
              <small>{formatFileSize(file.size)}</small>
            </span>
            <button type="button" onClick={() => setFile(null)} aria-label={`Quitar ${file.name}`}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="reopen__upload" onClick={() => inputRef.current?.click()}>
            <span className="reopen__upload-icon">
              <ImagePlus size={20} />
            </span>
            <span>
              <strong>Subir foto o captura de pantalla</strong>
              <small>PNG, JPG hasta 10 MB</small>
            </span>
            <Paperclip size={16} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" hidden onChange={pickFile} />
        {error && (
          <p className="reopen__hint reopen__hint--error" role="alert">
            <CircleAlert size={13} /> {error}
          </p>
        )}
      </div>

      <p className="reopen__notice">
        <Zap size={14} />
        Al reabrirlo, {technicianName ?? "el técnico asignado"} recibirá un aviso y el ticket regresará a
        “En proceso”.
      </p>
    </BottomSheet>
  );
}
