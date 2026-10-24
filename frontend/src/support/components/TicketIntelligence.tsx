import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useKnowledge } from '../context/KnowledgeContext';
import type { KnowledgeCategory } from '../data/knowledge';
import type { Ticket } from '../data/tickets';

const referenceCategory = (ticket: Ticket): KnowledgeCategory | undefined => {
  const subcategory = ticket.subcategory.toLocaleLowerCase('es');
  if (subcategory.includes('climatización')) return 'Climatización';
  if (subcategory.includes('redes') || subcategory.includes('conectividad')) return 'Redes y Conectividad';
  if (subcategory.includes('seguridad') || subcategory.includes('acceso')) return 'Seguridad y Accesos';
  if (subcategory.includes('audiovisual')) return 'Audiovisual y Salas';
  return undefined;
};

export default function TicketIntelligence({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  const { articles } = useKnowledge();
  const [shown, setShown] = useState(false);
  const [requested, setRequested] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'yes' | 'no'>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const category = referenceCategory(ticket);
  const suggestions = useMemo(() => articles.filter(article => article.status === 'Autorizado' && article.category === category).slice(0, 3), [articles, category]);

  return <div className="ai-panel">
    <div className="ai-notice"><ShieldCheck size={17} /><div><b>La IA solo aconseja; no ejecuta acciones.</b><p>Las sugerencias deben ser verificadas por el técnico antes de aplicarse.</p></div></div>
    <div className="ai-commands">
      <button onClick={() => setShown(value => !value)}><ChevronLeft size={17} />{shown ? 'Ocultar interpretación' : 'Interpretar con IA'}</button>
      <button className="ai-primary" onClick={() => { setShown(true); setRequested(true); }}><Lightbulb size={17} /> Obtener sugerencias</button>
    </div>
    {shown && <>
      <section className="kb-paper ai-interpret"><h2><BookOpen size={17} /> Interpretación del incidente</h2><p className="muted">No hay una interpretación generada. Conecta el servicio de IA para analizar este ticket.</p></section>
      {requested && <>
        <div className="kb-mode-info">Se consultan únicamente los artículos autorizados guardados en esta aplicación. El servicio de IA aún no está conectado.</div>
        <div className="ai-suggestion-title"><h2><Lightbulb size={19} /> Referencias técnicas</h2><span>{suggestions.length} disponibles</span></div>
        {suggestions.map(article => <article className="kb-paper ai-suggestion" key={article.id}>
          <div className="ai-suggestion-top"><span className="kb-state ok"><CheckCircle2 size={12} /> Fuente autorizada</span><span>{article.id}</span></div>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          <button className="ai-source" onClick={() => setOpen(value => ({ ...value, [article.id]: !value[article.id] }))}><BookOpen size={15} /><span><b>Consultar fuente técnica</b><small>{article.title} · {article.versions[0]?.version}</small></span><ChevronDown size={16} /></button>
          {open[article.id] && <div className="ai-source-detail"><p>Documento autorizado · {article.updated} · {article.category}</p><button onClick={() => navigate(`/conocimiento/${article.id}`)}>Abrir artículo <ChevronRight size={14} /></button></div>}
          <div className="ai-vote"><span>¿Fue útil esta referencia?</span><button className={feedback[article.id] === 'yes' ? 'chosen' : ''} onClick={() => setFeedback(value => ({ ...value, [article.id]: 'yes' }))}><ThumbsUp size={14} /> Útil</button><button className={feedback[article.id] === 'no' ? 'chosen' : ''} onClick={() => setFeedback(value => ({ ...value, [article.id]: 'no' }))}><ThumbsDown size={14} /> No útil</button></div>
          {feedback[article.id] && <p className="ai-feedback">Evaluación guardada en esta sesión local.</p>}
        </article>)}
        {suggestions.length === 0 && <div className="ai-no-answer"><span><AlertTriangle size={14} /> Sin referencias</span><strong>No hay artículos autorizados para esta clasificación.</strong><p>Agrega y autoriza contenido en la base de conocimiento para consultarlo aquí.</p></div>}
      </>}
    </>}
  </div>;
}
