import { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileImage, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatAttachmentSize, readTicketAttachment } from '../data/attachments';
import type { TicketFile } from '../data/tickets';
import { Button, Modal } from './UI';

export function SelectedAttachmentFiles({ files, onRemove, disabled = false }: {
  files: readonly File[]; onRemove: (index: number) => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  return <div className="selected-attachment-files">{files.map((file, index) => <div className="file-row" key={`${file.name}-${index}`}>
    <span className="file-icon">{file.type.startsWith('image/') ? <FileImage size={18}/> : <FileText size={18}/>}</span>
    <div className="file-details"><b title={file.name}>{file.name}</b><small>{formatAttachmentSize(file.size)}</small></div>
    <button type="button" disabled={disabled} aria-label={t('attachmentPicker.removeFile', { name: file.name })} onClick={() => onRemove(index)}><X size={17}/></button>
  </div>)}</div>;
}

export function StoredAttachmentFiles({ ownerId, files }: { ownerId: string; files: readonly TicketFile[] }) {
  const { t } = useTranslation();
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; file: TicketFile } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => { setPreview(null); setError(''); }, [ownerId]);
  useEffect(() => {
    if (!preview) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);
  const open = async (file: TicketFile, download: boolean) => {
    const owner = ownerId;
    setError('');
    if (!file.id) { setError(t('ticketAttachments.missingFile')); return; }
    setBusy(true);
    try {
      const blob = await readTicketAttachment(owner, file.id);
      if (currentOwner.current !== owner) return;
      if (!blob) { setError(t('ticketAttachments.missingFile')); return; }
      const url = URL.createObjectURL(blob);
      if (!download) setPreview({ url, file });
      else {
        const link = document.createElement('a');
        link.href = url; link.download = file.name;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch { if (currentOwner.current === owner) setError(t('ticketAttachments.readFailed')); }
    finally { setBusy(false); }
  };
  return <>
    <div className="stored-attachment-files">{files.map((file, index) => <div className="file-row" key={file.id || `${file.name}-${index}`}>
      <span className="file-icon">{file.mimeType?.startsWith('image/') ? <FileImage size={18}/> : <FileText size={18}/>}</span>
      <div className="file-details"><b title={file.name}>{file.name}</b><small>{file.size}</small></div>
      <div className="attachments-actions">
        {['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimeType || '') && <button type="button" disabled={busy} aria-label={t('ticketAttachments.previewName', { name: file.name })} onClick={() => void open(file, false)}><Eye size={17}/></button>}
        <button type="button" disabled={busy} aria-label={t('ticketAttachments.downloadName', { name: file.name })} onClick={() => void open(file, true)}><Download size={17}/></button>
      </div>
    </div>)}</div>
    {error && <p className="error-text" role="alert">{error}</p>}
    {preview && <Modal title={preview.file.name} onClose={() => setPreview(null)}><div className="attachment-preview">{preview.file.mimeType === 'application/pdf' ? <iframe src={preview.url} title={preview.file.name}/> : <img src={preview.url} alt={preview.file.name}/>}</div><div className="modal-buttons"><Button type="button" variant="secondary" onClick={() => void open(preview.file, true)}><Download size={16}/>{t('ticketAttachments.download')}</Button><Button type="button" onClick={() => setPreview(null)}>{t('close')}</Button></div></Modal>}
  </>;
}
