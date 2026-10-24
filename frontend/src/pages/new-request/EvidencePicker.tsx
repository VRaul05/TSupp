import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Camera, CircleAlert, CircleCheck, CloudUpload, FileText, Image, Info, Paperclip, Trash2, Upload, X } from "lucide-react";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILES,
  MAX_FILE_MB,
  formatFileSize,
  validateFile,
} from "../../services/ticketService";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  /** Versión web: zona para arrastrar y soltar archivos. */
  dropzone?: boolean;
}

interface Rejected {
  key: string;
  name: string;
  size: number;
  reason: string;
}

const ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** Adjuntar evidencias: foto con la cámara o archivos (FR-04). */
export function EvidencePicker({ files, onChange, dropzone = false }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [dragging, setDragging] = useState(false);
  const full = files.length >= MAX_FILES;

  function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // permite volver a elegir el mismo archivo
    addFiles(picked);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (full) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  function addFiles(picked: File[]) {
    const accepted: File[] = [];
    const newRejected: Rejected[] = [];

    for (const file of picked) {
      const key = `${file.name}-${file.size}-${Date.now()}`;
      const reason = validateFile(file);
      if (reason) {
        newRejected.push({ key, name: file.name, size: file.size, reason });
      } else if (files.length + accepted.length >= MAX_FILES) {
        newRejected.push({
          key,
          name: file.name,
          size: file.size,
          reason: `No se pudo adjuntar: máximo ${MAX_FILES} archivos`,
        });
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length) onChange([...files, ...accepted]);
    setRejected((prev) => [...newRejected, ...prev].slice(0, 3));
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <section className="request__field">
      <span className="request__label request__label--icon">
        <Paperclip size={16} /> {dropzone ? "Archivos adjuntos y capturas" : "Evidencia"}{" "}
        <span className="request__optional">(opcional)</span>
      </span>

      <div
        className={`evpick ${dropzone ? "evpick--drop" : ""} ${dragging ? "evpick--over" : ""}`}
        onDragOver={(e) => {
          if (!dropzone) return;
          e.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={dropzone ? handleDrop : undefined}
      >
        {full ? (
          <p className="evpick__full">
            <CircleCheck size={18} /> Ya adjuntaste {MAX_FILES} archivos. Quita alguno para agregar otro.
          </p>
        ) : (
          <div className="evpick__options">
            {/* TODO: abrir la cámara (en celular ya la abre el input con "capture";
                en computadora se puede usar navigator.mediaDevices.getUserMedia). */}
            <button type="button" className="evpick__option" onClick={() => cameraRef.current?.click()}>
              <span className="evpick__icon">
                <Camera size={22} />
              </span>
              <strong>Tomar foto</strong>
              <small>Usa la cámara</small>
            </button>
            <button type="button" className="evpick__option" onClick={() => fileRef.current?.click()}>
              <span className="evpick__icon">
                <Upload size={22} />
              </span>
              <strong>Subir archivo</strong>
              <small>{dropzone ? "Desde tu equipo" : "Desde tu galería"}</small>
            </button>
          </div>
        )}
        {dropzone && !full && (
          <p className="evpick__drag">
            <CloudUpload size={15} /> {dragging ? "Suelta los archivos aquí" : "o arrastra tus archivos a este recuadro"}
          </p>
        )}
      </div>

      <p className="evpick__rules">
        <Info size={13} /> Máx. {MAX_FILE_MB} MB por archivo · hasta {MAX_FILES} archivos ·{" "}
        {ALLOWED_EXTENSIONS.filter((e) => e !== "jpeg").map((e) => e.toUpperCase()).join(", ")}
      </p>

      {/* Inputs ocultos: "capture" abre la cámara trasera en el celular */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        hidden
        onChange={handleAdd}
      />
      <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={handleAdd} />


      {dropzone && files.length > 0 && (
        <p className="evidence__count">Archivos cargados ({files.length})</p>
      )}
      <ul className="evidence__list" aria-live="polite">
        {files.map((file, index) => {
          const isImage = file.type.startsWith("image/");
          return (
            <li key={`${file.name}-${index}`} className="evidence__item">
              <span className="evidence__icon">
                {isImage ? <Image size={18} /> : <FileText size={18} />}
              </span>
              <span className="evidence__info">
                <strong>{file.name}</strong>
                <span>
                  {formatFileSize(file.size)} <em className="evidence__ok">✓ Listo</em>
                </span>
              </span>
              <button
                type="button"
                className="evidence__remove"
                onClick={() => remove(index)}
                aria-label={`Quitar ${file.name}`}
              >
                <Trash2 size={18} />
              </button>
            </li>
          );
        })}

        {rejected.map((item) => (
          <li key={item.key} className="evidence__item evidence__item--error" role="alert">
            <span className="evidence__icon">
              <CircleAlert size={18} />
            </span>
            <span className="evidence__info">
              <strong>
                {item.name} ({formatFileSize(item.size)})
              </strong>
              <span>{item.reason}</span>
            </span>
            <button
              type="button"
              className="evidence__remove"
              onClick={() => setRejected((prev) => prev.filter((r) => r.key !== item.key))}
              aria-label="Descartar aviso"
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
