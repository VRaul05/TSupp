
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
  getAllKnowledge,
  createKnowledge,
  updateKnowledge,
  submitKnowledge,
  authorizeKnowledge,
  revokeKnowledge,
  serializeKnowledgeContent,
  adaptKnowledgeArticle,
} from '../services/knowledgeApi';

import { getSupportToken } from '../services/supportAuth';


type KnowledgeContextType = {
  articles: KnowledgeArticle[];
  loading: boolean;
  error: string | null;

  saveDraft: (article: KnowledgeArticle, note: string) => void;
  createDraft: (article: KnowledgeArticle) => void;

  // Funciones conectadas a PostgreSQL
  createDraftRemote: (article: KnowledgeArticle) => Promise<KnowledgeArticle>;
  saveDraftRemote: (article: KnowledgeArticle, note: string) => Promise<KnowledgeArticle>;

  submitDraftRemote: (id: string) => Promise<KnowledgeArticle>;
  authorizeDraftRemote: (id: string) => Promise<KnowledgeArticle>;
  revokeDraftRemote: (id: string) => Promise<KnowledgeArticle>;

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

  // Artículos provenientes de PostgreSQL
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
        const response = getSupportToken()
          ? await getAllKnowledge()
          : await getPublicKnowledge();

        if (!active) return;

        const adapted = response.map(adaptKnowledgeArticle);

        setRemoteArticles(adapted);

        console.log(
          'Artículos cargados desde PostgreSQL:',
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


  // Crear un borrador real en PostgreSQL
  const createDraftRemote = async (
    article: KnowledgeArticle
  ): Promise<KnowledgeArticle> => {
    const created = await createKnowledge({
      title: article.title.trim(),
      category: article.category,
      content: serializeKnowledgeContent(article.versions[0]),
      note: article.versions[0].note || 'Creación del borrador',
    });

    const adapted = adaptKnowledgeArticle(created);

    setRemoteArticles(previous => [
      adapted,
      ...previous.filter(a => a.id !== adapted.id),
    ]);

    return adapted;
  };

  // Editar artículo y crear una nueva versión en PostgreSQL
  const saveDraftRemote = async (
    article: KnowledgeArticle,
    note: string
  ): Promise<KnowledgeArticle> => {
    const updated = await updateKnowledge(article.id, {
      title: article.title.trim(),
      content: serializeKnowledgeContent(article.versions[0]),
      note: note.trim() || 'Actualización del borrador',
    });

    const adapted = adaptKnowledgeArticle(updated);

    setRemoteArticles(previous => [
      adapted,
      ...previous.filter(a => a.id !== adapted.id),
    ]);

    return adapted;
  };

  // Enviar un borrador a revisión
  const submitDraftRemote = async (
    id: string
  ): Promise<KnowledgeArticle> => {
    const response = await submitKnowledge(id);
    const adapted = adaptKnowledgeArticle(response);

    setRemoteArticles(previous => [
      adapted,
      ...previous.filter(a => a.id !== adapted.id),
    ]);

    return adapted;
  };

  // Autorizar un documento (solo supervisor)
  const authorizeDraftRemote = async (
    id: string
  ): Promise<KnowledgeArticle> => {
    const response = await authorizeKnowledge(id);
    const adapted = adaptKnowledgeArticle(response);

    setRemoteArticles(previous => [
      adapted,
      ...previous.filter(a => a.id !== adapted.id),
    ]);

    return adapted;
  };

  // Revocar un documento (solo supervisor)
  const revokeDraftRemote = async (
    id: string
  ): Promise<KnowledgeArticle> => {
    const response = await revokeKnowledge(id);
    const adapted = adaptKnowledgeArticle(response);

    setRemoteArticles(previous => [
      adapted,
      ...previous.filter(a => a.id !== adapted.id),
    ]);

    return adapted;
  };


  // Crear borrador local (compatibilidad temporal)
  const createDraft = (article: KnowledgeArticle) => {
    setLocalArticles(previous => [article, ...previous]);
  };

  // Editar borrador local (compatibilidad temporal)
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

  // Reiniciar borradores locales y actualizar API
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
        createDraftRemote,
        saveDraftRemote,
        submitDraftRemote,
        authorizeDraftRemote,
        revokeDraftRemote,
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
