import { useRef, useState } from 'react';
import { Bell, CheckCircle2, Clock3, Edit3, LockKeyhole, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Ticket } from '../data/tickets';
import { noteAttachmentOwner } from '../data/attachments';
import AttachmentPicker from './AttachmentPicker';
import { SelectedAttachmentFiles, StoredAttachmentFiles } from './AttachmentFiles';

export default function TicketNotes({ ticket, onToast }: { ticket: Ticket; onToast: (text: string) => void }) {
  const { session, addEntry, updateEntry, deleteEntry } = useApp();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const save = async () => {
    if (!message.trim() || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      await addEntry(ticket.id, 'notes', message.trim(), files);
      setMessage(''); setFiles([]); setNotify(false);
      onToast('Nota interna guardada. No se notificó al solicitante.');
    } catch { setError(t('attachmentPicker.noteSaveFailed')); }
    finally { busy.current = false; setSaving(false); }
  };
  const canEdit = (entry: typeof ticket.notes[number]) => Boolean(entry.authorId && entry.authorId === session?.userId && entry.createdAt && Date.now() - new Date(entry.createdAt).getTime() <= 15 * 60 * 1000);
  const remove = async (entryId: string) => {
    if (busy.current || !window.confirm('¿Eliminar tu nota interna y sus adjuntos?')) return;
    busy.current = true; setSaving(true); setError('');
    try { await deleteEntry(ticket.id, entryId); onToast('Nota eliminada.'); }
    catch { setError(t('attachmentPicker.noteDeleteFailed')); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="notes-panel">
    <div className="notes-privacy"><LockKeyhole size={18}/><div><b>Solo visibles para agentes y supervisor</b><p>El solicitante nunca podrá ver estas anotaciones.</p></div></div>
    {ticket.notes.length === 0 && <p className="muted">Todavía no hay notas internas registradas.</p>}
    {ticket.notes.map((note, index) => <article className="notes-card" key={note.id}>
      <div className="notes-card-head"><div className={'notes-avatar ' + (index % 2 ? 'pink' : 'orange')}>{note.author.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()}</div><div className="notes-person"><strong>{note.author}</strong><small>{note.time}</small></div><span className="notes-age"><Clock3 size={13}/>{canEdit(note) ? 'Editable' : 'Interna'}</span></div>
      {editing === note.id ? <textarea className="edit-textarea" rows={4} value={editText} onChange={event => setEditText(event.target.value)}/> : <p className="notes-text">{note.text}</p>}
      {Boolean(note.files?.length) && <StoredAttachmentFiles ownerId={noteAttachmentOwner(ticket.id, note.id)} files={note.files!}/>}
      {canEdit(note) && <div className="notes-tools">
        {editing === note.id ? <button disabled={saving} onClick={() => { if (!editText.trim()) return; updateEntry(ticket.id, note.id, editText.trim()); setEditing(null); onToast('Nota actualizada.'); }}><Save size={14}/> Guardar</button> : <button disabled={saving} onClick={() => { setEditing(note.id); setEditText(note.text); }}><Edit3 size={14}/> Editar</button>}
        <button disabled={saving} onClick={() => void remove(note.id)}><Trash2 size={14}/> Eliminar</button>
      </div>}
    </article>)}
    <div className="notes-compose">
      <div className="notes-compose-head"><h3><LockKeyhole size={17}/> Nueva nota interna (privada)</h3><span>Solo equipo</span></div>
      <textarea rows={4} maxLength={1000} disabled={saving} placeholder="Describe observaciones técnicas, números de parte, pruebas en sitio o notas para el relevo de turno..." value={message} onChange={event => setMessage(event.target.value)}/>
      <p className="notes-character-count">{message.length}/1000</p>
      <AttachmentPicker onFiles={selected => setFiles(previous => [...previous, ...selected])} currentCount={files.length} disabled={saving}/>
      <SelectedAttachmentFiles files={files} disabled={saving} onRemove={index => setFiles(previous => previous.filter((_, item) => item !== index))}/>
      <p className="attachments-help">{t('attachmentPicker.notePrivacy')}</p>
      <label className="notes-notify"><input type="checkbox" disabled={saving} checked={notify} onChange={event => setNotify(event.target.checked)}/><Bell size={14}/> Recordar al supervisor en la consola <small>(requiere API)</small></label>
      <button className="notes-save" disabled={!message.trim() || saving} onClick={() => void save()}><CheckCircle2 size={17}/>{saving ? t('ticketAttachments.saving') : 'Guardar nota'}</button>
      {error && <p className="error-text" role="alert">{error}</p>}
      {notify && <p className="muted">El recordatorio es solo visual en esta versión local; no envía notificaciones.</p>}
    </div>
  </section>;
}
