
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  KnowledgeArticle,
  KnowledgeVersion,
} from '../data/knowledge';

import {
  loadCollection,
  saveCollection,
} from '../data/storage';

import {
  getPublicKnowledge,
  adaptKnowledgeArticle,
} from '../services/knowledgeApi';

type KnowledgeContextType = {
  articles: KnowledgeArticle[];
  loading: boolean;
  error: string | null;
  saveDraft: (article: KnowledgeArticle, note: string) => void;
  createDraft: (article: KnowledgeArticle) => void;
  setAuthorization: (
    id: string,
    status: 'Autorizado' | 'Revocado'
  ) => void;
  resetKnowledge: () => void;
};

const Context = createContext<KnowledgeContextType | null>(null);

const knowledgeStorageKey = 'pugstic-knowledge-v3';

const previousDemoArticleIds = [
  'KB-032',
  'KB-033',
  'KB-018',
  'KB-021',
  'KB-019',
];

const load = () =>
  loadCollection<KnowledgeArticle>(
    knowledgeStorageKey,
    previousDemoArticleIds
  );

export function KnowledgeProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Artículos almacenados localmente
  const [localArticles, setLocalArticles] =
    useState<KnowledgeArticle[]>(load);

  // Artículos autorizados provenientes de PostgreSQL
  const [remoteArticles, setRemoteArticles] =
    useState<KnowledgeArticle[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Consultar la API de FastAPI
  useEffect(() => {
    let active = true;

    async function loadRemoteArticles() {
      setLoading(true);
      setError(null);

      try {
        const response = await getPublicKnowledge();

        if (!active) return;

        const adapted = response.map(adaptKnowledgeArticle);

        setRemoteArticles(adapted);

        console.log(
          'Artículos autorizados cargados desde PostgreSQL:',
          adapted.length
        );
      } catch (err) {
        if (!active) return;

        console.error('Error consultando Knowledge API:', err);

        setError(
          'No se pudieron cargar los artículos del servidor.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRemoteArticles();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Persistencia de borradores locales
  useEffect(() => {
    saveCollection(knowledgeStorageKey, localArticles);
  }, [localArticles]);

  // Combinar documentos remotos y borradores locales
  const articles = useMemo(() => {
    const remoteIds = new Set(
      remoteArticles.map(article => article.id)
    );

    const uniqueLocal = localArticles.filter(
      article => !remoteIds.has(article.id)
    );

    return [...remoteArticles, ...uniqueLocal];
  }, [remoteArticles, localArticles]);

  // Crear borrador local
  const createDraft = (article: KnowledgeArticle) => {
    setLocalArticles(previous => [article, ...previous]);
  };

  // Editar borrador local
  const saveDraft = (
    article: KnowledgeArticle,
    note: string
  ) => {
    setLocalArticles(previous =>
      previous.map(saved => {
        if (saved.id !== article.id) return saved;

        const latest = article.versions[0];
        const previousVersion = saved.versions[0];

        const next =
          parseInt(
            previousVersion.version
              .replace(/^v/, '')
              .split('.')[1] || '0',
            10
          ) + 1;

        const updated = new Date().toLocaleString(
          'es-MX',
          {
            timeZone: 'America/Mexico_City',
          }
        );

        const version: KnowledgeVersion = {
          ...latest,
          version: `v0.${next}`,
          date: updated,
          note:
            note.trim() ||
            'Actualización del borrador',
          author: article.author,
        };

        return {
          ...article,
          status: 'Borrador',
          updated,
          versions: [
            version,
            ...saved.versions,
          ],
        };
      })
    );
  };

  // Autorización local temporal
  const setAuthorization = (
    id: string,
    status: 'Autorizado' | 'Revocado'
  ) => {
    setLocalArticles(previous =>
      previous.map(article =>
        article.id === id
          ? {
              ...article,
              status,
              updated: new Date().toLocaleString(
                'es-MX',
                {
                  timeZone: 'America/Mexico_City',
                }
              ),
            }
          : article
      )
    );
  };

  // Reiniciar borradores y actualizar API
  const resetKnowledge = () => {
    setLocalArticles(load());
    setRefreshKey(previous => previous + 1);
  };

  return (
    <Context.Provider
      value={{
        articles,
        loading,
        error,
        saveDraft,
        createDraft,
        setAuthorization,
        resetKnowledge,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(Context);

  if (!context) {
    throw new Error('KnowledgeProvider missing');
  }

  return context;
}
