
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role, Ticket, TicketInput, Status, Entry } from '../data/tickets';
import { loadCollection, saveCollection } from '../data/storage';
import { noteAttachmentOwner, removeAttachmentOwner, saveTicketAttachments } from '../data/attachments';
import { loginSupport, getSupportProfile, getSupportToken, clearSupportSession } from '../services/supportAuth';

const ticketStorageKey = 'pugstic-tickets';
const previousDemoTicketIds = ['TCK-1042', 'TCK-1035', 'TCK-1048', 'TCK-1051'];
const loadTickets = () => loadCollection<Ticket>(ticketStorageKey, previousDemoTicketIds);
const localTime = (date = new Date()) => date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' });
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

type Session = { role: Role; userId: string };
type AppState = {
  session: Session | null;
  login: (role: Role) => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  tickets: Ticket[];
  createTicket: (input: TicketInput, files?: readonly File[]) => Promise<Ticket>;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addEntry: (id: string, channel: 'history' | 'notes', text: string, files?: readonly File[]) => Promise<void>;
  changeStatus: (id: string, state: Status, reason?: string) => void;
  updateEntry: (ticketId: string, entryId: string, text: string) => void;
  deleteEntry: (ticketId: string, entryId: string) => Promise<void>;
  reset: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);

  // Recuperar solamente sesiones JWT válidas.
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!getSupportToken()) return;

      try {
        const user = await getSupportProfile();
        if (!active) return;

        if (user.role !== 'agent' && user.role !== 'supervisor') {
          clearSupportSession();
          setSession(null);
          return;
        }

        setSession({
          role: user.role === 'supervisor' ? 'supervisor' : 'agente',
          userId: user.id,
        });
      } catch {
        if (!active) return;
        clearSupportSession();
        setSession(null);
      }
    };

    void restoreSession();
    return () => { active = false; };
  }, []);

  useEffect(() => saveCollection(ticketStorageKey, tickets), [tickets]);

  const createTicket = async (input: TicketInput, files: readonly File[] = []): Promise<Ticket> => {
    const id = `TCK-${generateId().replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase()}`;
    const savedFiles = files.length ? await saveTicketAttachments(id, files, []) : [];
    const ticket: Ticket = {
      ...input,
      title: input.title.trim(),
      requester: input.requester.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      id,
      requesterId: session?.userId,
      status: 'Asignado',
      assignedTo: 'agente-1',
      created: localTime(),
      sla: '',
      slaLabel: '',
      icon: input.subcategory.includes('Climatización') ? 'thermometer' : input.subcategory.includes('Seguridad') ? 'key' : 'monitor',
      answers: (input.answers || []).map(answer => ({ ...answer })),
      files: savedFiles,
      history: [],
      notes: [],
    };
    setTickets(previous => [ticket, ...previous]);
    return ticket;
  };

  const updateTicket = (id: string, patch: Partial<Ticket>) => setTickets(previous => previous.map(ticket => ticket.id === id ? { ...ticket, ...patch } : ticket));

  const addEntry = async (id: string, channel: 'history' | 'notes', text: string, files: readonly File[] = []): Promise<void> => {
    if (!text.trim()) return;
    const now = new Date();
    const entryId = generateId();
    const savedFiles = files.length ? await saveTicketAttachments(noteAttachmentOwner(id, entryId), files, []) : [];
    const entry: Entry = { id: entryId, files: savedFiles, author: session?.role === 'supervisor' ? 'Supervisor' : 'Agente de soporte', text: text.trim(), time: localTime(now), private: channel === 'notes', createdAt: now.toISOString(), authorId: session?.userId };
    setTickets(previous => previous.map(ticket => ticket.id === id ? { ...ticket, [channel]: [...ticket[channel], entry] } : ticket));
  };

  const changeStatus = (id: string, status: Status, reason?: string) => setTickets(previous => previous.map(ticket => ticket.id === id ? { ...ticket, status, history: [...ticket.history, { id: generateId(), author: 'Sistema · acción del agente', text: `Estado: ${ticket.status} → ${status}${reason ? ' · ' + reason : ''}`, time: localTime() }] } : ticket));

  const canEditEntry = (entry: Entry) => entry.authorId === session?.userId && Boolean(entry.createdAt) && Date.now() - new Date(entry.createdAt!).getTime() <= 900000;

  const updateEntry = (ticketId: string, entryId: string, text: string) => {
    if (!text.trim()) return;
    setTickets(previous => previous.map(ticket => ticket.id === ticketId ? { ...ticket, notes: ticket.notes.map(entry => entry.id === entryId && canEditEntry(entry) ? { ...entry, text: text.trim() } : entry) } : ticket));
  };

  const deleteEntry = async (ticketId: string, entryId: string): Promise<void> => {
    const note = tickets.find(ticket => ticket.id === ticketId)?.notes.find(entry => entry.id === entryId);
    if (!note || !canEditEntry(note)) return;
    if (note.files?.length) await removeAttachmentOwner(noteAttachmentOwner(ticketId, entryId));
    setTickets(previous => previous.map(ticket => ticket.id === ticketId ? { ...ticket, notes: ticket.notes.filter(entry => entry.id !== entryId) } : ticket));
  };

  // Acceso simulado temporal (compatibilidad con Access.tsx).
  const login = (role: Role) => {
    clearSupportSession();
    setSession({ role, userId: role === 'empleado' ? 'empleado-1' : role === 'agente' ? 'agente-1' : 'supervisor-1' });
  };

  // Autenticación real con FastAPI.
  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    const result = await loginSupport(email, password);
    const role: Role = result.user.role === 'supervisor' ? 'supervisor' : 'agente';
    setSession({ role, userId: result.user.id });
  };

  const logout = () => {
    clearSupportSession();
    setSession(null);
    try { localStorage.removeItem('pugstic-session'); } catch { /* Ignorar error de almacenamiento. */ }
  };

  const reset = () => setTickets(loadTickets());

  return <AppContext.Provider value={{ session, login, loginWithCredentials, logout, tickets, createTicket, updateTicket, addEntry, changeStatus, updateEntry, deleteEntry, reset }}>{children}</AppContext.Provider>;
}

export function useApp() { const state = useContext(AppContext); if (!state) throw new Error('AppProvider required'); return state; }
