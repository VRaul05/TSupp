import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CloudUpload, Info, LoaderCircle, Paperclip, RotateCcw, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ATTACHMENT_ACCEPT, AttachmentValidationError, MAX_TICKET_ATTACHMENTS, validateAttachmentSelection } from '../data/attachments';
import '../styles/attachment-picker.css';

export type AttachmentPickerProps = {
  onFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  currentCount?: number;
  maxCount?: number;
  accept?: string;
  formatsLabel?: string;
  label?: string;
  optional?: boolean;
};

/** A single entry point for file uploads, drag and drop, and camera evidence. */
export default function AttachmentPicker({
  onFiles, disabled = false, currentCount = 0, maxCount = MAX_TICKET_ATTACHMENTS,
  accept = ATTACHMENT_ACCEPT, formatsLabel = 'JPG, PNG, PDF, TXT, LOG, DOCX', label, optional = true,
}: AttachmentPickerProps) {
  const { t } = useTranslation();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const nativeCameraInput = useRef<HTMLInputElement>(null);
  const existingPhotoInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const photoUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const dragDepth = useRef(0);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const blocked = disabled || saving;
  const countLimit = Math.min(maxCount, MAX_TICKET_ATTACHMENTS);

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const clearPhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
    setPhoto(null);
    setPreview('');
  }, []);

  const closeCamera = useCallback(() => {
    if (busy.current) return;
    requestId.current += 1;
    stopCamera();
    clearPhoto();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraLive(false);
    setVideoReady(false);
    setCapturing(false);
    setCameraError('');
  }, [clearPhoto, stopCamera]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      stopCamera();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeCamera();
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.current.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [cameraOpen, closeCamera]);

  useEffect(() => {
    if (cameraLive && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => { /* The native video controls remain available. */ });
    }
  }, [cameraLive]);

  const validationMessage = (cause: unknown) => {
    if (cause instanceof AttachmentValidationError) {
      if (cause.code === 'tooMany') return t('attachmentPicker.tooMany', { maxCount: countLimit, defaultValue: 'Puedes adjuntar hasta {{maxCount}} archivos por ticket.' });
      if (cause.code === 'tooLarge') return t('attachmentPicker.tooLarge', { fileName: cause.fileName, defaultValue: 'El archivo «{{fileName}}» supera los 10 MB.' });
      return t('attachmentPicker.invalidType', { fileName: cause.fileName, formats: formatsLabel, defaultValue: 'El archivo «{{fileName}}» no es compatible. Formatos: {{formats}}.' });
    }
    return t('attachmentPicker.saveFailed', 'No se pudieron adjuntar los archivos. Inténtalo de nuevo.');
  };

  const submitFiles = async (files: File[], fromCamera = false): Promise<boolean> => {
    if (disabled || busy.current || !files.length) return false;
    setError('');
    if (fromCamera) setCameraError('');
    try {
      if (currentCount + files.length > countLimit) throw new AttachmentValidationError('tooMany');
      validateAttachmentSelection(files, currentCount);
      busy.current = true;
      setSaving(true);
      await onFiles(files);
      return true;
    } catch (cause) {
      if (mounted.current) {
        const message = validationMessage(cause);
        setError(message);
        if (fromCamera) setCameraError(message);
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const requestCamera = async () => {
    if (disabled || busy.current || cameraLoading) return;
    const activeRequest = ++requestId.current;
    stopCamera();
    clearPhoto();
    setCameraOpen(true);
    setCameraLoading(true);
    setCameraLive(false);
    setVideoReady(false);
    setCameraError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraLoading(false);
      setCameraError(!window.isSecureContext
        ? t('attachmentPicker.cameraInsecure', 'La cámara necesita una conexión HTTPS o localhost. Puedes subir una foto guardada en tu equipo.')
        : t('attachmentPicker.cameraUnsupported', 'Este navegador no permite abrir la cámara. Puedes subir una foto guardada en tu equipo.'));
      return;
    }
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } } });
      // A permission request can resolve after the dialog has been closed.
      if (!mounted.current || requestId.current !== activeRequest) {
        acquired.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = acquired;
      setCameraLive(true);
    } catch (cause) {
      if (!mounted.current || requestId.current !== activeRequest) return;
      const name = cause instanceof DOMException ? cause.name : '';
      setCameraError(name === 'NotAllowedError' || name === 'SecurityError'
        ? t('attachmentPicker.cameraDenied', 'No se concedió permiso para usar la cámara. Habilítalo en tu navegador y vuelve a intentar, o sube una foto existente.')
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? t('attachmentPicker.cameraMissing', 'No se encontró una cámara conectada. Conecta una cámara o sube una foto existente.')
          : name === 'NotReadableError' || name === 'TrackStartError'
            ? t('attachmentPicker.cameraBusy', 'No se pudo acceder a la cámara. Cierra otras aplicaciones que la estén usando y vuelve a intentar.')
            : t('attachmentPicker.cameraFailed', 'No se pudo iniciar la cámara. Vuelve a intentar o sube una foto existente.'));
    } finally {
      if (mounted.current && requestId.current === activeRequest) setCameraLoading(false);
    }
  };

  const takePhoto = () => {
    if (blocked) return;
    setError('');
    if (currentCount >= countLimit) {
      setError(validationMessage(new AttachmentValidationError('tooMany')));
      return;
    }
    // Mobile browsers can invoke the operating system's camera directly.
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      nativeCameraInput.current?.click();
    } else {
      void requestCamera();
    }
  };

  const capturePhoto = async () => {
    const player = video.current;
    if (!player?.videoWidth || !player.videoHeight || capturing || blocked) return;
    const activeRequest = requestId.current;
    setCapturing(true);
    setCameraError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = player.videoWidth;
      canvas.height = player.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(player, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!mounted.current || requestId.current !== activeRequest) return;
      if (!blob) throw new Error('Camera capture failed');
      const file = new File([blob], `foto-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' });
      validateAttachmentSelection([file], currentCount);
      const url = URL.createObjectURL(file);
      photoUrl.current = url;
      setPhoto(file);
      setPreview(url);
      stopCamera();
      setCameraLive(false);
      setVideoReady(false);
    } catch (cause) {
      if (mounted.current && requestId.current === activeRequest) {
        setCameraError(cause instanceof AttachmentValidationError ? validationMessage(cause) : t('attachmentPicker.captureFailed', 'No se pudo tomar la foto. Vuelve a intentar.'));
      }
    } finally {
      if (mounted.current && requestId.current === activeRequest) setCapturing(false);
    }
  };

  const inputFiles = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    void submitFiles(files);
  };

  return <div className="attachment-picker" aria-busy={saving}>
    <div id={`${id}-label`} className="attachment-picker__label">
      <Paperclip size={16} aria-hidden="true" />
      <span>{label ?? t('attachmentPicker.label', 'Archivos adjuntos y capturas')}</span>
      {optional && <span className="attachment-picker__optional">{t('attachmentPicker.optional', '(opcional)')}</span>}
    </div>
    <div
      className={`attachment-picker__zone${dragging ? ' attachment-picker__zone--dragging' : ''}${blocked ? ' attachment-picker__zone--disabled' : ''}`}
      role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-limits${error ? ` ${id}-error` : ''}`}
      onDragEnter={event => {
        event.preventDefault();
        if (blocked || !Array.from(event.dataTransfer.types).includes('Files')) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = blocked ? 'none' : 'copy'; }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
      onDrop={event => {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setDragging(false);
        if (!blocked) void submitFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="attachment-picker__actions">
        <button type="button" className="attachment-picker__tile" onClick={takePhoto} disabled={blocked}>
          <span className="attachment-picker__icon"><Camera size={21} strokeWidth={1.8} aria-hidden="true" /></span>
          <strong>{t('attachmentPicker.takePhoto', 'Tomar foto')}</strong>
          <span className="attachment-picker__hint">{t('attachmentPicker.cameraHint', 'Usa la cámara')}</span>
        </button>
        <button type="button" className="attachment-picker__tile" onClick={() => { setError(''); fileInput.current?.click(); }} disabled={blocked}>
          <span className="attachment-picker__icon">{saving ? <LoaderCircle className="attachment-picker__spinner" size={21} aria-hidden="true" /> : <Upload size={21} strokeWidth={1.8} aria-hidden="true" />}</span>
          <strong>{t('attachmentPicker.uploadFile', 'Subir archivo')}</strong>
          <span className="attachment-picker__hint">{t('attachmentPicker.uploadHint', 'Desde tu equipo')}</span>
        </button>
      </div>
      <div className="attachment-picker__drag-hint"><CloudUpload size={15} aria-hidden="true" /><span>{t('attachmentPicker.dragHint', 'o arrastra tus archivos a este recuadro')}</span></div>
    </div>
    <p id={`${id}-limits`} className="attachment-picker__limits"><Info size={13} aria-hidden="true" /><span>{t('attachmentPicker.limits', { maxCount: countLimit, formats: formatsLabel, defaultValue: 'Máx. 10 MB por archivo · hasta {{maxCount}} archivos · {{formats}}' })}</span></p>
    {error && <p id={`${id}-error`} className="attachment-picker__error" role="alert">{error}</p>}
    <input className="attachment-picker__input" type="file" ref={fileInput} multiple accept={accept} disabled={blocked} onChange={event => inputFiles(event.currentTarget)} tabIndex={-1} aria-hidden="true" />
    <input className="attachment-picker__input" type="file" ref={nativeCameraInput} accept="image/jpeg,image/png" capture="environment" disabled={blocked} onChange={event => inputFiles(event.currentTarget)} tabIndex={-1} aria-hidden="true" />
    <input className="attachment-picker__input" type="file" ref={existingPhotoInput} accept="image/jpeg,image/png" disabled={blocked} onChange={event => inputFiles(event.currentTarget)} tabIndex={-1} aria-hidden="true" />
    {cameraOpen && createPortal(<div className="attachment-camera" onMouseDown={event => { if (event.currentTarget === event.target) closeCamera(); }}>
      <div className="attachment-camera__dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-camera-title`} tabIndex={-1} ref={dialog}>
        <div className="attachment-camera__header"><h2 id={`${id}-camera-title`}><Camera size={21} aria-hidden="true" />{t('attachmentPicker.cameraTitle', 'Tomar foto')}</h2><button ref={closeButton} className="attachment-camera__close" type="button" onClick={closeCamera} disabled={saving} aria-label={t('attachmentPicker.closeCamera', 'Cerrar cámara')}><X size={21} /></button></div>
        <div className="attachment-camera__preview">
          {preview ? <img src={preview} alt={t('attachmentPicker.capturedPhoto', 'Foto capturada')} />
            : cameraLive ? <video ref={video} playsInline autoPlay muted controls aria-label={t('attachmentPicker.cameraPreview', 'Vista previa de la cámara')} onCanPlay={() => setVideoReady(true)} />
              : cameraLoading ? <div className="attachment-camera__status" role="status"><LoaderCircle className="attachment-picker__spinner" size={30} /><span>{t('attachmentPicker.cameraLoading', 'Iniciando cámara…')}</span></div>
                : <div className="attachment-camera__status"><Camera size={42} aria-hidden="true" /></div>}
        </div>
        {cameraError && <p className="attachment-picker__error attachment-camera__error" role="alert">{cameraError}</p>}
        <div className="attachment-camera__footer">
          <button type="button" className="attachment-camera__button" onClick={closeCamera} disabled={saving}>{t('attachmentPicker.cancel', 'Cancelar')}</button>
          {photo ? <>
            <button type="button" className="attachment-camera__button" onClick={() => void requestCamera()} disabled={blocked || capturing}><RotateCcw size={16} />{t('attachmentPicker.cameraRetake', 'Volver a tomar')}</button>
            <button type="button" className="attachment-camera__button attachment-camera__button--primary" disabled={blocked} onClick={async () => { if (await submitFiles([photo], true)) { if (mounted.current) closeCamera(); } }}>{saving && <LoaderCircle className="attachment-picker__spinner" size={16} />}{t('attachmentPicker.cameraUsePhoto', 'Usar foto')}</button>
          </> : cameraLive ? <button type="button" className="attachment-camera__button attachment-camera__button--primary" disabled={blocked || capturing || !videoReady} onClick={() => void capturePhoto()}><Camera size={17} />{t('attachmentPicker.cameraCapture', 'Capturar foto')}</button>
            : !cameraLoading && <><button type="button" className="attachment-camera__button" disabled={blocked} onClick={() => { closeCamera(); existingPhotoInput.current?.click(); }}>{t('attachmentPicker.cameraExistingPhoto', 'Seleccionar una foto existente')}</button><button type="button" className="attachment-camera__button attachment-camera__button--primary" disabled={blocked} onClick={() => void requestCamera()}>{t('attachmentPicker.cameraRetry', 'Reintentar cámara')}</button></>}
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
