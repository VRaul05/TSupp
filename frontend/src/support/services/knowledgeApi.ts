
  import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeVersion,
} from '../data/knowledge';

  import { getSupportToken } from './supportAuth';

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

    const content = deserializeKnowledgeContent(api.content);

    return {
      id: api.id,
      title: api.title,
      category,
      subcategory: api.category,
      status:
    api.status === 'authorized' ? 'Autorizado' :
    api.status === 'under_review' ? 'En revisión' :
    api.status === 'revoked' ? 'Revocado' :
    'Borrador',
      author: 'Base de conocimiento',
      updated: 'Sin fecha disponible',
      excerpt: content.summary.slice(0, 155),
      attachments: [],
      versions: [
        {
          version: `v0.${api.current_version}`,
          date: 'Sin fecha disponible',
          author: 'Base de conocimiento',
          note: api.status === 'authorized'
            ? 'Versión autorizada'
            : 'Versión actual',
          summary: content.summary,
          requirements: content.requirements,
          steps: content.steps,
          command: content.command,
        },
      ],
    };
  }


  /* ==========================================
    Gestión documental autenticada con JWT
  ========================================== */

  export interface KnowledgeInput {
    title: string;
    category: string;
    content: string;
    note?: string;
  }

  export interface KnowledgeEditInput {
    content: string;
    note?: string;
    title?: string;
  }

  export interface ApiKnowledgeVersion {
    number: number;
    content: string;
    note: string;
    created_at: string;
  }

  // Solicitudes protegidas: el backend verifica el JWT y el rol.
  async function knowledgeRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const token = getSupportToken();

    if (!token) {
      throw new Error('Debes iniciar sesión para gestionar documentos.');
    }

    const response = await fetch(`${API_URL}/api/knowledge${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.');
      }

      if (response.status === 403) {
        throw new Error('No tienes permisos para realizar esta operación.');
      }

      let detail = `Error del servidor: ${response.status}`;

      try {
        const data: { detail?: unknown } = await response.json();
        if (typeof data.detail === 'string') detail = data.detail;
      } catch {
        // Conservar el mensaje HTTP si no hay respuesta JSON.
      }

      throw new Error(detail);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // Consultar todos los artículos, incluidos los borradores.
  export function getAllKnowledge(): Promise<ApiKnowledgeArticle[]> {
    return knowledgeRequest<ApiKnowledgeArticle[]>('');
  }

  // Consultar un artículo interno.
  export function getKnowledgeArticle(id: string): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}`
    );
  }

  // Crear un borrador en PostgreSQL.
  export function createKnowledge(
    article: KnowledgeInput
  ): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>('', 'POST', article);
  }

  // Editar y generar una nueva versión.
  export function updateKnowledge(
    id: string,
    article: KnowledgeEditInput
  ): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}`,
      'PUT',
      article
    );
  }

  // Consultar historial de versiones.
  export function getKnowledgeVersions(
    id: string
  ): Promise<ApiKnowledgeVersion[]> {
    return knowledgeRequest<ApiKnowledgeVersion[]>(
      `/${encodeURIComponent(id)}/versions`
    );
  }

  // Enviar borrador a revisión.
  export function submitKnowledge(id: string): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}/submit`,
      'POST'
    );
  }

  // Autorizar documento: solo supervisor.
  export function authorizeKnowledge(id: string): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}/authorize`,
      'POST'
    );
  }

  // Revocar documento: solo supervisor.
  export function revokeKnowledge(id: string): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}/revoke`,
      'POST'
    );
  }

  // Restaurar versión anterior: solo supervisor.
  export function restoreKnowledge(
    id: string,
    version: number
  ): Promise<ApiKnowledgeArticle> {
    return knowledgeRequest<ApiKnowledgeArticle>(
      `/${encodeURIComponent(id)}/restore/${version}`,
      'POST'
    );
  }

  // Eliminar documento: solo supervisor.
  export function deleteKnowledge(id: string): Promise<void> {
    return knowledgeRequest<void>(
      `/${encodeURIComponent(id)}`,
      'DELETE'
    );
  }

/* ==========================================
   Conversión entre React y PostgreSQL
========================================== */

const KNOWLEDGE_FORMAT = 'tsupp-knowledge-v1';

interface StructuredKnowledgeContent {
  format: string;
  summary: string;
  requirements: string[];
  steps: string[];
  command?: string;
}

// Convertir el formulario de React al contenido de FastAPI.
export function serializeKnowledgeContent(
  version: KnowledgeVersion
): string {
  const content: StructuredKnowledgeContent = {
    format: KNOWLEDGE_FORMAT,
    summary: version.summary,
    requirements: version.requirements,
    steps: version.steps,
    command: version.command,
  };

  return JSON.stringify(content);
}

// Recuperar los campos del formulario desde PostgreSQL.
export function deserializeKnowledgeContent(
  content: string
): Pick<KnowledgeVersion, 'summary' | 'requirements' | 'steps' | 'command'> {
  try {
    const parsed: unknown = JSON.parse(content);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'format' in parsed &&
      parsed.format === KNOWLEDGE_FORMAT &&
      'summary' in parsed &&
      typeof parsed.summary === 'string' &&
      'requirements' in parsed &&
      Array.isArray(parsed.requirements) &&
      parsed.requirements.every(item => typeof item === 'string') &&
      'steps' in parsed &&
      Array.isArray(parsed.steps) &&
      parsed.steps.every(item => typeof item === 'string')
    ) {
      return {
        summary: parsed.summary,
        requirements: parsed.requirements,
        steps: parsed.steps,
        command: 'command' in parsed && typeof parsed.command === 'string'
          ? parsed.command
          : undefined,
      };
    }
  } catch {
    // Compatibilidad con artículos existentes de texto plano.
  }

  // Los artículos anteriores siguen siendo legibles.
  return {
    summary: content,
    requirements: [],
    steps: content
      .split('\n')
      .map(line => line.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter(Boolean),
    command: undefined,
  };
}
