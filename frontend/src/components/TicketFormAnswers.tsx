import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Eye, Plus } from 'lucide-react';
import { Button, Card, Modal, TextField } from './UI';
import { useApp } from '../context/AppContext';
import type { Ticket } from '../data/tickets';
import { getTicketQuestions, normalizeTicketAnswers, validateTicketAnswers, type TicketAnswer } from '../data/ticketForms';

interface TicketFormDialogProps {
  subcategory: string;
  answers: TicketAnswer[];
  onSave?: (answers: TicketAnswer[]) => void;
  onClose: () => void;
}

export function TicketFormDialog({ subcategory, answers, onSave, onClose }: TicketFormDialogProps) {
  const { t } = useTranslation();
  const prefix = useId();
  const questions = getTicketQuestions(subcategory);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(
    questions.map(question => [question.id, answers.find(answer => answer.question === question.question)?.answer ?? '']),
  ));
  const [error, setError] = useState('');
  const editable = Boolean(onSave);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSave) return;
    const nextAnswers = questions.map(question => ({ question: question.question, answer: (draft[question.id] ?? '').trim() }));
    if (!validateTicketAnswers(subcategory, nextAnswers)) {
      setError(t('ticketFormRequired', { defaultValue: 'Responde las preguntas obligatorias antes de guardar.' }));
      const missing = questions.find(question => question.required && !(draft[question.id] ?? '').trim());
      if (missing) document.getElementById(`${prefix}-${missing.id}`)?.focus();
      return;
    }
    onSave(normalizeTicketAnswers(subcategory, nextAnswers));
  };

  return <Modal title={editable ? t('ticketFormComplete', { defaultValue: 'Completar formulario' }) : t('ticketFormView', { defaultValue: 'Ver formulario' })} onClose={onClose}>
    <div className="ticket-form-dialog">
      {subcategory && <p className="ticket-form-intro">{subcategory}</p>}
      {editable ? <form onSubmit={submit} noValidate>
        <p className="muted ticket-form-intro">{t('ticketFormInstructions', { defaultValue: 'Completa la información del problema. Los campos con * son obligatorios.' })}</p>
        <div className="ticket-form-fields">{questions.map((question, index) => {
          const fieldId = `${prefix}-${question.id}`;
          return <label key={question.id} className="ticket-form-label" htmlFor={fieldId}>
            <span className="select-label">{t(question.key, { defaultValue: question.question })}{question.required ? ' *' : ` (${t('ticketFormOptional', { defaultValue: 'opcional' })})`}</span>
            {question.required ? <TextField id={fieldId} required maxLength={500} autoFocus={index === 0} value={draft[question.id] ?? ''} onChange={event => { setDraft(previous => ({ ...previous, [question.id]: event.target.value })); setError(''); }} aria-invalid={Boolean(error) && !(draft[question.id] ?? '').trim()} aria-describedby={error ? `${prefix}-error` : undefined}/> : <textarea id={fieldId} className="text-area" rows={3} maxLength={2000} value={draft[question.id] ?? ''} onChange={event => setDraft(previous => ({ ...previous, [question.id]: event.target.value }))}/>}
          </label>;
        })}</div>
        {error && <p id={`${prefix}-error`} className="error-text" role="alert">{error}</p>}
        <div className="ticket-form-actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel', { defaultValue: 'Cancelar' })}</Button><Button type="submit">{t('ticketFormSave', { defaultValue: 'Guardar respuestas' })}</Button></div>
      </form> : <>
        <div className="ticket-form-fields">{answers.length ? answers.map((answer, index) => <div className="answer" key={`${index}-${answer.question}`}><small>{answer.question}</small><p>{answer.answer}</p></div>) : <p className="muted">{t('ticketFormEmpty', { defaultValue: 'No se registraron respuestas adicionales.' })}</p>}</div>
        <div className="ticket-form-actions"><Button type="button" variant="secondary" onClick={onClose}>{t('close', { defaultValue: 'Cerrar' })}</Button></div>
      </>}
    </div>
  </Modal>;
}

export default function TicketFormAnswers({ ticket, onToast }: { ticket: Ticket; onToast: (message: string) => void }) {
  const { t } = useTranslation();
  const { updateTicket, addEntry } = useApp();
  const [open, setOpen] = useState(false);
  const hasAnswers = ticket.answers.length > 0;
  const save = (answers: TicketAnswer[]) => {
    if (hasAnswers) return;
    updateTicket(ticket.id, { answers });
    addEntry(ticket.id, 'history', t('ticketFormHistorySaved', { defaultValue: 'Se completaron las respuestas del formulario.' }));
    setOpen(false);
    onToast(t('ticketFormSaved', { defaultValue: 'Respuestas del formulario guardadas.' }));
  };

  return <Card className="ticket-form-card">
    <div className="ticket-form-header"><h2><BookOpen size={19}/> {t('formAnswers', { defaultValue: 'Respuestas del formulario' })}</h2><Button type="button" variant="secondary" onClick={() => setOpen(true)}>{hasAnswers ? <Eye size={16}/> : <Plus size={16}/>} {hasAnswers ? t('ticketFormView', { defaultValue: 'Ver formulario' }) : t('ticketFormComplete', { defaultValue: 'Completar formulario' })}</Button></div>
    {hasAnswers ? ticket.answers.map((answer, index) => <div className="answer" key={`${index}-${answer.question}`}><small>{answer.question}</small><p>{answer.answer}</p></div>) : <p className="muted">{t('ticketFormEmpty', { defaultValue: 'No se registraron respuestas adicionales.' })}</p>}
    {open && <TicketFormDialog subcategory={ticket.subcategory} answers={ticket.answers} onSave={hasAnswers ? undefined : save} onClose={() => setOpen(false)}/>}
  </Card>;
}
