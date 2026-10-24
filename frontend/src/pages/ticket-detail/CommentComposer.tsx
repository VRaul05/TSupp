import { forwardRef, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, CircleAlert, Paperclip, Reply, Send, X } from "lucide-react";
import { MAX_FILES, validateFile } from "../../services/ticketService";

interface Props {
  placeholder: string;
  hint?: string;
  onSend: (text: string, files: File[]) => Promise<void>;
  /** Versión web: caja grande con botones con texto. */
  variant?: "mobile" | "web";
  title?: string;
  sendLabel?: string;
  note?: string;
  highlight?: boolean;
}

const ACCEPT = ".jpg,.jpeg,.png,.pdf,.txt,.log,.docx";

/** Caja para escribir al técnico, con adjuntos y foto (FR-15). */
export const CommentComposer = forwardRef<HTMLTextAreaElement, Props>(function CommentComposer(
  { placeholder, hint, onSend, variant = "mobile", title, sendLabel = "Enviar", note, highlight = false },
  textareaRef,
) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || files.length > 0) && !sending;

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");
    const valid: File[] = [];
    for (const file of picked) {
      const reason = validateFile(file);
      if (reason) {
        setError(`${file.name}: ${reason.replace("No se pudo adjuntar: ", "")}`);
      } else if (files.length + valid.length >= MAX_FILES) {
        setError(`Máximo ${MAX_FILES} archivos por mensaje`);
      } else {
        valid.push(file);
      }
    }
    setFiles((prev) => [...prev, ...valid]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(text.trim() || "Adjunto evidencia.", files);
      setText("");
      setFiles([]);
      // Regresa la caja a un renglón.
      const box = document.getElementById("comment-input");
      if (box) box.style.height = "auto";
      setError("");
    } catch {
      setError("No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={`composer composer--${variant}`} onSubmit={handleSubmit}>
      {files.length > 0 && (
        <ul className="composer__files">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`}>
              <Paperclip size={12} />
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Quitar ${file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="composer__error" role="alert">
          <CircleAlert size={14} /> {error}
        </p>
      )}

      {variant === "web" ? (
        <div className={`composer__box ${highlight ? "composer__box--highlight" : ""}`}>
          {title && (
            <label htmlFor="comment-input" className="composer__title">
              <Reply size={15} /> {title}
            </label>
          )}
          <textarea
            id="comment-input"
            ref={textareaRef}
            rows={3}
            maxLength={1000}
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="composer__bar">
            <button type="button" className="composer__tool" onClick={() => fileRef.current?.click()}>
              <Paperclip size={16} /> Adjuntar archivo o imagen
            </button>
            <button type="button" className="composer__tool composer__tool--icon" onClick={() => cameraRef.current?.click()} aria-label="Tomar foto">
              <Camera size={16} />
            </button>
            {note && <span className="composer__note">{note}</span>}
            <button type="submit" className="composer__send-web" disabled={!canSend}>
              {sending ? <span className="composer__spinner" /> : <Send size={16} />} {sendLabel}
            </button>
          </div>
        </div>
      ) : (
      <div className="composer__row">
          <button
            type="button"
            className="composer__icon"
            onClick={() => fileRef.current?.click()}
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={20} />
          </button>
          <div className="composer__field">
            <label htmlFor="comment-input" className="sr-only">
              Mensaje para el técnico
            </label>
            <textarea
              id="comment-input"
              ref={textareaRef}
              rows={1}
              maxLength={1000}
              placeholder={placeholder}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Crece con el texto hasta 4 renglones.
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 104)}px`;
              }}
            />
            <button
              type="button"
              className="composer__camera"
              onClick={() => cameraRef.current?.click()}
              aria-label="Tomar foto"
            >
              <Camera size={18} />
            </button>
          </div>
          <button type="submit" className="composer__send" disabled={!canSend} aria-label="Enviar">
            {sending ? <span className="composer__spinner" /> : <Send size={18} />}
          </button>
        </div>
  
      )}
      {hint && (
        <p className="composer__hint">
          <span className="composer__hint-dot" aria-hidden="true" /> {hint}
        </p>
      )}

      <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={addFiles} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        hidden
        onChange={addFiles}
      />
    </form>
  );
});
