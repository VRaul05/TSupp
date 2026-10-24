import type { TicketFile } from './tickets';

export type KnowledgeStatus = 'Autorizado' | 'Borrador' | 'Revocado';
export type KnowledgeCategory = 'Climatización' | 'Redes y Conectividad' | 'Seguridad y Accesos' | 'Audiovisual y Salas';
export type KnowledgeVersion = { version: string; date: string; author: string; note: string; summary: string; requirements: string[]; steps: string[]; command?: string };
export type KnowledgeAttachment = TicketFile & { url?: string };
export type KnowledgeArticle = { id: string; title: string; category: KnowledgeCategory; subcategory: string; status: KnowledgeStatus; author: string; updated: string; excerpt: string; confidence?: number; sourceTicket?: string; attachments: KnowledgeAttachment[]; versions: KnowledgeVersion[] };
export const seedKnowledge: KnowledgeArticle[] = [];
