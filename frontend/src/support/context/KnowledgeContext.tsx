import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { KnowledgeArticle, KnowledgeVersion } from '../data/knowledge';
import { loadCollection, saveCollection } from '../data/storage';

type KnowledgeContextType = { articles: KnowledgeArticle[]; saveDraft: (article: KnowledgeArticle, note: string) => void; createDraft: (article: KnowledgeArticle) => void; setAuthorization: (id: string, status: 'Autorizado' | 'Revocado') => void; resetKnowledge: () => void };
const Context = createContext<KnowledgeContextType | null>(null);
const knowledgeStorageKey = 'pugstic-knowledge-v3';
const previousDemoArticleIds = ['KB-032', 'KB-033', 'KB-018', 'KB-021', 'KB-019'];
const load = () => loadCollection<KnowledgeArticle>(knowledgeStorageKey, previousDemoArticleIds);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(load);
  useEffect(() => saveCollection(knowledgeStorageKey, articles), [articles]);
  const saveDraft = (article: KnowledgeArticle, note: string) => setArticles(previous => previous.map(saved => {
    if (saved.id !== article.id) return saved;
    const latest = article.versions[0];
    const previousVersion = saved.versions[0];
    const next = parseInt(previousVersion.version.replace(/^v/, '').split('.')[1] || '0', 10) + 1;
    const updated = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    const version: KnowledgeVersion = { ...latest, version: `v0.${next}`, date: updated, note: note.trim() || 'Actualización del borrador', author: article.author };
    return { ...article, status: 'Borrador', updated, versions: [version, ...saved.versions] };
  }));
  const createDraft = (article: KnowledgeArticle) => setArticles(previous => [article, ...previous]);
  const setAuthorization = (id: string, status: 'Autorizado' | 'Revocado') => setArticles(previous => previous.map(article => article.id === id ? { ...article, status, updated: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) } : article));
  return <Context.Provider value={{ articles, saveDraft, createDraft, setAuthorization, resetKnowledge: () => setArticles(load()) }}>{children}</Context.Provider>;
}
export function useKnowledge() { const context = useContext(Context); if (!context) throw Error('KnowledgeProvider missing'); return context; }
