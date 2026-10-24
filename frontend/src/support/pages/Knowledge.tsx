
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Filter,
  HelpCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { useKnowledge } from '../context/KnowledgeContext';
import { useApp } from '../context/AppContext';
import type { KnowledgeArticle } from '../data/knowledge';

const categories = [
  'Todas las categorías',
  'Climatización',
  'Redes y Conectividad',
  'Seguridad y Accesos',
  'Audiovisual y Salas',
];

export default function Knowledge() {
  const nav = useNavigate();
  const { articles } = useKnowledge();
  const { session } = useApp();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas las categorías');
  const [mode, setMode] = useState<'Semántica' | 'Palabra clave'>('Semántica');
  const [sort, setSort] = useState<'Relevancia' | 'Recientes'>('Relevancia');
  const [scope, setScope] = useState<'Todos' | 'Autorizado' | 'Borrador'>('Todos');

  const canEdit = session?.role !== 'empleado';

  const results = useMemo(
    () =>
      articles
        .filter(a => canEdit || a.status === 'Autorizado')
        .filter(a => scope === 'Todos' || a.status === scope)
        .filter(a => category === 'Todas las categorías' || a.category === category)
        .map(a => {
          const term = query.toLocaleLowerCase('es').trim();
          const title = a.title.toLocaleLowerCase('es');

          // Incluimos el identificador para permitir buscar "KB-018".
          const hay = [
            a.id,
            a.title,
            a.category,
            a.subcategory,
            a.excerpt,
          ]
            .join(' ')
            .toLocaleLowerCase('es');

          const score = term
            ? title.includes(term)
              ? 3
              : hay.includes(term)
                ? 1
                : 0
            : 1;

          return { ...a, score };
        })
        .filter(a => a.score > 0)
        .sort((a, b) =>
          sort === 'Relevancia'
            ? b.score - a.score
            : b.id.localeCompare(a.id)
        ),
    [articles, query, category, scope, sort, canEdit]
  );

  return (
    <div className="screen kb-screen">
      <header className="mobile-header kb-header">
        <button
          className="icon-button"
          onClick={() => nav('/tickets')}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>

        <strong>Conocimiento</strong>

        <span className="kb-agent-pill">
          {session?.role === 'supervisor'
            ? 'Supervisor'
            : canEdit
              ? 'Agente'
              : 'Consulta'}
        </span>

        <button
          className="icon-button kb-help"
          title="Documentos autorizados y borradores"
          onClick={() =>
            window.alert(
              'Los documentos en borrador solo son visibles para agentes y supervisores. La IA utiliza exclusivamente documentos autorizados.'
            )
          }
        >
          <HelpCircle size={18} />
        </button>
      </header>

      <main className="kb-content">
        <div className="kb-search">
          <Search size={17} />
          <input
            aria-label="Buscar conocimiento"
            placeholder="Buscar conocimiento técnico o identificador"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          {query && (
            <button
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="kb-search-modes">
          <button
            className={mode === 'Semántica' ? 'selected' : ''}
            onClick={() => setMode('Semántica')}
          >
            <Sparkles size={16} /> Semántica <span>IA</span>
          </button>

          <button
            className={mode === 'Palabra clave' ? 'selected' : ''}
            onClick={() => setMode('Palabra clave')}
          >
            Aa&nbsp; Palabra clave
          </button>
        </div>

        <div className="kb-filters">
          <button
            className={scope === 'Todos' ? 'active' : ''}
            onClick={() => setScope('Todos')}
          >
            Todos (
            {articles.filter(a => canEdit || a.status === 'Autorizado').length})
          </button>

          <select
            aria-label="Filtrar categoría"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>

          {canEdit && (
            <select
              aria-label="Filtrar estado"
              value={scope}
              onChange={e => setScope(e.target.value as typeof scope)}
            >
              <option value="Todos">Todos los estados</option>
              <option value="Autorizado">Autorizados</option>
              <option value="Borrador">Borradores</option>
            </select>
          )}
        </div>

        <div className="kb-result-line">
          <span>
            Mostrando <b>{results.length}</b> resultados{' '}
            {query && `para “${query}”`}
          </span>

          <button
            onClick={() =>
              setSort(s => (s === 'Relevancia' ? 'Recientes' : 'Relevancia'))
            }
          >
            <Filter size={13} />
            {sort}
            <ChevronDown size={13} />
          </button>
        </div>

        {mode === 'Semántica' && query && (
          <div className="kb-mode-info">
            Búsqueda local de demostración. La búsqueda semántica real se
            conectará al servicio RAG/pgvector.
          </div>
        )}

        <div className="kb-results">
          {results.map((a: KnowledgeArticle) => (
            <button
              className="kb-result-card"
              key={a.id}
              onClick={() => nav(`/conocimiento/${a.id}`)}
            >
              <div className="kb-result-badges">
                <span
                  className={
                    'kb-state ' +
                    (a.status === 'Autorizado' ? 'ok' : 'draft')
                  }
                >
                  {a.status === 'Autorizado' ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Clock3 size={12} />
                  )}
                  {a.status}
                </span>

                <span className="kb-category-pill">{a.category}</span>

                {/* NUEVO: Identificador visible del artículo */}
                <span className="kb-article-id">{a.id}</span>
              </div>

              <h2>{a.title}</h2>
              <p>{a.excerpt}</p>

              <div className="kb-result-bottom">
                <span>
                  {a.versions[0].version} · {a.updated} · {a.author}
                </span>
                <ChevronRight size={17} />
              </div>
            </button>
          ))}

          {results.length === 0 && (
            <div className="kb-empty">
              <BookOpen size={28} />
              <b>{articles.length ? 'Sin resultados' : 'Aún no hay artículos'}</b>
              <p>{articles.length ? 'Prueba otra palabra, identificador o categoría.' : canEdit ? 'Crea un borrador para comenzar.' : 'Los artículos autorizados aparecerán aquí.'}</p>
            </div>
          )}
        </div>
      </main>

      {canEdit && (
        <button
          className="kb-fab"
          onClick={() => nav('/conocimiento/nuevo')}
        >
          <Plus size={17} /> Nuevo borrador
        </button>
      )}
    </div>
  );
}
