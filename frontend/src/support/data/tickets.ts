export type Role = 'empleado' | 'agente' | 'supervisor';
export type Status = 'Asignado' | 'En proceso' | 'En espera del usuario' | 'Resuelto' | 'Escalado';
export type Priority = 'Crítica' | 'Alta' | 'Media' | 'Baja';
export type TicketType = 'Incidente' | 'Solicitud' | 'Consulta';
export interface Entry { id: string; author: string; text: string; time: string; private?: boolean; createdAt?: string; authorId?: string; files?: TicketFile[] }
export interface TicketFile {
  /** Los adjuntos antiguos pueden contener únicamente nombre y tamaño. */
  id?: string;
  name: string;
  size: string;
  sizeBytes?: number;
  mimeType?: string;
}
export interface Ticket {
  id: string;
  title: string;
  requester: string;
  requesterId?: string;
  priority: Priority;
  status: Status;
  type: TicketType;
  sla: string;
  slaLabel: string;
  category: string;
  subcategory: string;
  description: string;
  location: string;
  created: string;
  assignedTo: string;
  icon: 'monitor' | 'thermometer' | 'key';
  answers: { question: string; answer: string }[];
  files: TicketFile[];
  history: Entry[];
  notes: Entry[];
}
export type TicketInput = Pick<Ticket, 'title' | 'requester' | 'description' | 'location' | 'priority' | 'category' | 'subcategory' | 'type'> & { answers?: Ticket['answers'] };
export const initialTickets: Ticket[] = [];
export const priorityOrder: Record<Priority, number> = { Crítica: 0, Alta: 1, Media: 2, Baja: 3 };
