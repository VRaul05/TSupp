
import type {
  KnowledgeArticle,
  KnowledgeCategory,
} from '../data/knowledge';

const API_URL = 'http://127.0.0.1:8000';

export interface ApiKnowledgeArticle {
  id: string;
  title: string;
  category: string;
  status: string;
  current_version: number;
  authorized_version: number | null;
  content: string;
}

export async function getPublicKnowledge(
  query = ''
): Promise<ApiKnowledgeArticle[]> {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  const suffix = params.toString();
  const url = `${API_URL}/api/knowledge/public${suffix ? `?${suffix}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error al consultar artículos: ${response.status}`
    );
  }

  return response.json();
}

export async function getPublicKnowledgeArticle(
  id: string
): Promise<ApiKnowledgeArticle> {
  const response = await fetch(
    `${API_URL}/api/knowledge/public/${encodeURIComponent(id)}`
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo consultar el artículo: ${response.status}`
    );
  }

  return response.json();
}

// Convertir la respuesta de FastAPI al formato del frontend
export function adaptKnowledgeArticle(
  api: ApiKnowledgeArticle
): KnowledgeArticle {
  const categories: Record<string, KnowledgeCategory> = {
    Redes: 'Redes y Conectividad',
    'Redes y Conectividad': 'Redes y Conectividad',
    'Climatización': 'Climatización',
    'Seguridad y Accesos': 'Seguridad y Accesos',
    'Audiovisual y Salas': 'Audiovisual y Salas',
  };

  const category =
    categories[api.category] ?? 'Redes y Conectividad';

  const steps = api.content
    .split('\n')
    .map(step =>
      step.replace(/^\s*\d+[.)]\s*/, '').trim()
    )
    .filter(Boolean);

  return {
    id: api.id,
    title: api.title,
    category,
    subcategory: api.category,
    status: 'Autorizado',
    author: 'Base de conocimiento',
    updated: 'Sin fecha disponible',
    excerpt: api.content.slice(0, 155),
    attachments: [],
    versions: [
      {
        version: `v0.${api.authorized_version ?? api.current_version}`,
        date: 'Sin fecha disponible',
        author: 'Base de conocimiento',
        note: 'Versión autorizada',
        summary: api.content,
        requirements: [],
        steps,
      },
    ],
  };
}
