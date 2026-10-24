import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CheckCircle2, Plus } from 'lucide-react';
import { Button, Card, TextField } from '../components/UI';
import { useApp } from '../context/AppContext';
import { TicketFormDialog } from '../components/TicketFormAnswers';
import { validateTicketAnswers } from '../data/ticketForms';
import AttachmentPicker from '../components/AttachmentPicker';
import { SelectedAttachmentFiles } from '../components/AttachmentFiles';
import type { Priority, TicketType, Ticket } from '../data/tickets';

const subcategories: Record<string, string[]> = {
  'Tecnología / TI': ['Equipo audiovisual', 'Software y licencias', 'Seguridad y acceso', 'Redes y conectividad'],
  'Instalaciones y Mantenimiento': ['Climatización (HVAC) / Termostatos', 'Iluminación', 'Mobiliario', 'Plomería'],
};

export default function TicketCreate() {
  const { createTicket, session } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [type, setType] = useState<TicketType | ''>('');
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Ticket['answers']>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    if (!title.trim() || !requester.trim() || !description.trim() || !category || !subcategory || !priority || !type) {
      setError(t('ticketFieldsRequired'));
      return;
    }
    if (!validateTicketAnswers(subcategory, answers)) {
      setError(t('ticketFormRequiredBeforeCreate'));
      setFormOpen(true);
      return;
    }
    busy.current = true; setSaving(true); setError('');
    try {
      const ticket = await createTicket({ title: title.trim(), requester: requester.trim(), description: description.trim(), location: location.trim(), category, subcategory, priority, type, answers }, files);
      navigate(session?.role === 'empleado' ? '/tickets' : `/tickets/${ticket.id}`, { replace: true, state: { flash: t('ticketCreated') } });
    } catch { setError(t('attachmentPicker.ticketSaveFailed')); }
    finally { busy.current = false; setSaving(false); }
  };

  return <div className="screen detail-screen ticket-create-screen">
    <header className="mobile-header"><button className="icon-button" disabled={saving} aria-label={t('back')} onClick={() => navigate('/tickets')}><ArrowLeft size={20}/></button><div className="header-heading"><h1>{t('createTicket')}</h1><p>{t('supportConsole')}</p></div></header>
    <form onSubmit={submit}><fieldset className="ticket-create-fieldset" disabled={saving}>
      <main className="detail-main"><div className="detail-cards ticket-create-fields"><Card><div className="ticket-create-grid">
        <label className="ticket-create-description"><span className="select-label">{t('ticketTitle')} *</span><TextField required maxLength={200} value={title} onChange={event => setTitle(event.target.value)}/></label>
        <label><span className="select-label">{t('requester')} *</span><TextField required maxLength={120} value={requester} onChange={event => setRequester(event.target.value)}/></label>
        <label><span className="select-label">{t('location')}</span><TextField maxLength={200} value={location} onChange={event => setLocation(event.target.value)}/></label>
        <label><span className="select-label">{t('category')} *</span><select required value={category} onChange={event => { setCategory(event.target.value); setSubcategory(''); setAnswers([]); }}><option value="">{t('selectOption')}</option>{Object.keys(subcategories).map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span className="select-label">{t('subcategory')} *</span><select required disabled={!category} value={subcategory} onChange={event => { setSubcategory(event.target.value); setAnswers([]); }}><option value="">{t('selectOption')}</option>{(subcategories[category] || []).map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span className="select-label">{t('priority')} *</span><select required value={priority} onChange={event => setPriority(event.target.value as Priority)}><option value="">{t('selectOption')}</option>{(['Crítica', 'Alta', 'Media', 'Baja'] as const).map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span className="select-label">{t('ticketType')} *</span><select required value={type} onChange={event => setType(event.target.value as TicketType)}><option value="">{t('selectOption')}</option>{(['Incidente', 'Solicitud', 'Consulta'] as const).map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="ticket-create-description"><span className="select-label">{t('description')} *</span><textarea required className="text-area" rows={5} maxLength={5000} value={description} onChange={event => setDescription(event.target.value)}/></label>
      </div>{error && <p className="error-text" role="alert">{error}</p>}</Card><Card><div className="ticket-form-header"><h2><BookOpen size={19}/>{t('ticketFormTitle')}</h2><Button type="button" variant="secondary" disabled={!subcategory} onClick={() => setFormOpen(true)}><BookOpen size={16}/>{t(answers.length ? 'ticketFormReview' : 'ticketFormComplete')}</Button></div><p className="muted">{!subcategory ? t('ticketFormChooseSubcategory') : answers.length ? t('ticketFormCompleted') : t('ticketFormBeforeCreate')}</p>{answers.length > 0 && <p className="ticket-form-complete-status"><CheckCircle2 size={16}/>{t('ticketFormAnswerCount', { count: answers.length })}</p>}</Card><Card><AttachmentPicker onFiles={selected => setFiles(previous => [...previous, ...selected])} currentCount={files.length} disabled={saving}/><SelectedAttachmentFiles files={files} disabled={saving} onRemove={index => setFiles(previous => previous.filter((_, item) => item !== index))}/></Card></div></main>
      <footer className="detail-actions"><Button type="button" variant="secondary" onClick={() => navigate('/tickets')}>{t('cancel')}</Button><Button type="submit"><Plus size={16}/>{t(saving ? 'ticketAttachments.saving' : 'createTicket')}</Button></footer>
    </fieldset></form>
    {formOpen && <TicketFormDialog subcategory={subcategory} answers={answers} onClose={() => setFormOpen(false)} onSave={value => { setAnswers(value); setError(''); setFormOpen(false); }}/>}
  </div>;
}
