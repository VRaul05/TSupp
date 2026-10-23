import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Ticket, TicketFile } from '../data/tickets';
import { AttachmentValidationError, getTicketAttachmentMetadata, saveTicketAttachments } from '../data/attachments';
import { Card } from './UI';
import AttachmentPicker from './AttachmentPicker';
import { StoredAttachmentFiles } from './AttachmentFiles';

function mergeFiles(current: readonly TicketFile[], stored: readonly TicketFile[]) {
  return [...current, ...stored.filter(file => !current.some(existing => existing.id === file.id))];
}

export default function TicketAttachments({ ticket, onToast }: { ticket: Ticket; onToast: (text: string) => void }) {
  const { t } = useTranslation();
  const { updateTicket } = useApp();
  const currentTicket = useRef(ticket);
  currentTicket.current = ticket;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getTicketAttachmentMetadata(ticket.id).then(stored => {
      if (!active) return;
      const current = currentTicket.current.files;
      const restored = mergeFiles(current, stored);
      if (restored.length !== current.length) updateTicket(ticket.id, { files: restored });
    }).catch(() => { if (active) setError(t('ticketAttachments.storageUnavailable')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticket.id, t]);

  const selectFiles = async (files: File[]) => {
    if (!files.length || saving) return;
    const ticketId = ticket.id;
    const originalFiles = currentTicket.current.files;
    setSaving(true); setError('');
    try {
      const saved = await saveTicketAttachments(ticketId, files, originalFiles);
      const latestFiles = currentTicket.current.id === ticketId ? currentTicket.current.files : originalFiles;
      updateTicket(ticketId, { files: mergeFiles(latestFiles, saved) });
      if (currentTicket.current.id === ticketId) onToast(t('ticketAttachments.saved'));
    } catch (failure) {
      if (currentTicket.current.id !== ticketId) return;
      const key = failure instanceof AttachmentValidationError ? failure.code === 'invalidType' ? 'invalidType' : failure.code === 'tooLarge' ? 'tooLarge' : 'tooMany' : 'saveFailed';
      setError(t(`ticketAttachments.${key}`, { name: failure instanceof AttachmentValidationError ? failure.fileName : '' }));
    } finally { setSaving(false); }
  };

  return <Card className="attachments-card">
    <AttachmentPicker onFiles={selectFiles} currentCount={ticket.files.length} disabled={loading || saving}/>
    <p className="attachments-help">{t('ticketAttachments.localOnly')}</p>
    {loading && <p className="muted" role="status">{t('ticketAttachments.loading')}</p>}
    {saving && <p className="muted" role="status">{t('ticketAttachments.saving')}</p>}
    {ticket.files.length ? <><p className="muted">{t('ticketAttachments.title', { count: ticket.files.length })}</p><StoredAttachmentFiles ownerId={ticket.id} files={ticket.files}/></> : !loading && <p className="muted">{t('ticketAttachments.empty')}</p>}
    {error && <p className="error-text attachment-error" role="alert">{error}</p>}
  </Card>;
}
