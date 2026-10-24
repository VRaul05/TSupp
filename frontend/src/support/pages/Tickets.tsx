import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, ArrowLeft, Bell, ChevronRight, CheckCircle2, Clock3, KeyRound, Monitor, MoreVertical, Plus, RefreshCw, Search, Thermometer, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { priorityOrder, type Ticket } from '../data/tickets';
import { Badge, Button, Modal, TextField } from '../components/UI';

const ticketIcon = { monitor: Monitor, thermometer: Thermometer, key: KeyRound };

function TicketCard({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { session } = useApp();
  const [preview, setPreview] = useState(false);
  const Icon = ticketIcon[ticket.icon];
  const isDanger = ticket.priority === 'Crítica';
  const open = () => session?.role === 'empleado' ? setPreview(true) : navigate(`/tickets/${ticket.id}`);
  return <article className={`ticket-card ${isDanger ? 'ticket-critical' : ticket.priority === 'Alta' ? 'ticket-high' : ''}`}>
    <div className="ticket-header"><div className="ticket-type-icon"><Icon size={17}/></div><span className="ticket-id">#{ticket.id}</span><span className="ticket-requester">{ticket.requester}</span><button className="icon-button three-dot" aria-label={t('viewTicket', { id: ticket.id })} onClick={open}><MoreVertical size={18}/></button></div>
    <button className="ticket-title-button" onClick={open}>{ticket.title}</button>
    <div className="ticket-tags"><Badge tone={isDanger ? 'red' : ticket.priority === 'Baja' ? 'green' : 'orange'}>{ticket.priority}</Badge><Badge tone="neutral">{ticket.status}</Badge><Badge tone="orange">{ticket.subcategory || ticket.category}</Badge></div>
    <button className={`ticket-deadline ${ticket.sla && isDanger ? 'urgent' : ''}`} onClick={open}><Clock3 size={15}/><span>{ticket.sla ? t('dueIn', { value: ticket.sla }) : t('slaPending')}</span><ChevronRight size={17}/></button>
    {preview && <Modal title={`#${ticket.id}`} onClose={() => setPreview(false)}><h2>{ticket.title}</h2><Badge tone="neutral">{ticket.status}</Badge><p className="modal-explainer">{ticket.description}</p>{ticket.location && <p className="muted">{t('location')}: {ticket.location}</p>}<p className="muted">{ticket.created}</p><div className="modal-buttons"><Button onClick={() => setPreview(false)}>{t('close')}</Button></div></Modal>}
  </article>;
}

export default function Tickets() {
  const { tickets, session } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const [filter, setFilter] = useState<'Todos' | 'Asignado' | 'En proceso' | 'En espera del usuario'>('Todos');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<'priority' | 'name'>('priority');
  const roleTickets = useMemo(() => tickets.filter(ticket => session?.role === 'supervisor' || (session?.role === 'empleado' ? ticket.requesterId === session.userId : ticket.assignedTo === session?.userId)), [tickets, session]);
  const visible = useMemo(() => roleTickets.filter(ticket => filter === 'Todos' || ticket.status === filter).filter(ticket => [ticket.id, ticket.title, ticket.requester, ticket.category].join(' ').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a, b) => sort === 'priority' ? priorityOrder[a.priority] - priorityOrder[b.priority] : a.title.localeCompare(b.title)), [roleTickets, filter, search, sort]);

  return <div className="screen ticket-list-screen">
    <header className="mobile-header list-header"><button className="icon-button" onClick={() => navigate('/tickets')} aria-label={t('back')}><ArrowLeft size={20}/></button><div className="header-heading"><div className="header-line"><h1>{t('myTickets')}</h1><span className="active-tag">{t(session?.role === 'supervisor' ? 'supervisor' : session?.role === 'empleado' ? 'employee' : 'technician')}</span></div><p>{t('supportConsole')}</p></div><button className="icon-button" aria-label={t('search')} onClick={() => setSearching(value => !value)}>{searching ? <X size={20}/> : <Search size={20}/>}</button><button className="icon-button notification-icon" aria-label={t('alerts')} onClick={() => navigate('/alertas')}><Bell size={20}/></button></header>
    <main className="list-body">
      {flash && <div className="list-flash" role="status"><CheckCircle2 size={17}/><span>{flash}</span><button aria-label={t('close')} onClick={() => navigate(location.pathname, { replace: true, state: null })}><X size={15}/></button></div>}
      {searching && <div className="search-row"><TextField value={search} autoFocus placeholder={t('ticketSearchPlaceholder')} onChange={event => setSearch(event.target.value)} aria-label={t('search')}/></div>}
      <div className="filter-strip" role="group" aria-label={t('filterTickets')}>{(['Todos', 'Asignado', 'En proceso', 'En espera del usuario'] as const).map(value => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{t(value === 'Todos' ? 'all' : value === 'Asignado' ? 'assigned' : value === 'En proceso' ? 'inProgress' : 'waiting')} ({value === 'Todos' ? roleTickets.length : roleTickets.filter(ticket => ticket.status === value).length})</button>)}</div>
      <div className="list-toolbar"><button onClick={() => setSort(value => value === 'priority' ? 'name' : 'priority')}><ArrowDownUp size={14}/>{t(sort === 'priority' ? 'order' : 'orderName')}</button><button onClick={() => { setSearch(''); navigate('/tickets', { replace: true, state: { flash: t('ticketsRefreshed') } }); }}><RefreshCw size={14}/>{t('refresh')}</button></div>
      <Button className="list-create-button" onClick={() => navigate('/registro')}><Plus size={16}/>{t('createTicket')}</Button>
      <div className="ticket-stack">{visible.length ? visible.map(ticket => <TicketCard key={ticket.id} ticket={ticket}/>) : <div className="empty-tickets"><h2>{t(roleTickets.length ? 'noResults' : 'emptyTicketsTitle')}</h2><p>{t(roleTickets.length ? 'adjustTicketFilters' : 'emptyTicketsBody')}</p></div>}</div>
    </main>
  </div>;
}
