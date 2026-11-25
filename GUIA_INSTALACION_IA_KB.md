# TSupp — IA, Fase 1: documentos + autorización + embeddings + búsqueda

**Estado del entregable:** código generado y comprobado con compilación Python, `pytest` de procesamiento y prueba de importación sin escritura (`--dry-run`). **No probado contra tu PostgreSQL, tu FastAPI ni tu cuenta de supervisor**; esas verificaciones deben hacerse localmente.

**Origen de datos:** ZIP `tsupp_knowledgebase.zip` aportado por el equipo (historia G-04). Se incluyeron 9 artículos Markdown, 112 preguntas y PDF institucional original; no se incluyen 46 manuales de dispositivos ni el archivo `.exe`.

**Alcance:** no implementa todavía respuestas generadas por LLM, MLflow ni toda la administración de versiones. La búsqueda es **diagnóstica** (similitud), no una afirmación de confianza calibrada. Tampoco implementa directamente la carga libre de nuevos archivos PDF/DOCX; esa funcionalidad viene en la siguiente etapa.

## Cuidado con Git y autenticación

Último estado conocido: rama `feature/auth-rbac` con cambios no confirmados, y Alembic `c2a90610db15 (head)` aplicado en tu base. Este paquete **depende** del módulo Auth local y crea una migración hija de `c2a90610db15`.

- No cambies a `main` ni hagas `reset --hard`.
- No hagas `git add .` ni publiques `.env`.
- No intentes abrir un PR de IA a `main` antes de integrar y revisar la rama de autenticación; revisa primero el estado de Git y separa las revisiones con Omar. No mezcles commits de IA con commits de Auth sin acordar el orden de integración.
- Los archivos empaquetados son nuevas rutas; solo debes editar manualmente **dos archivos existentes** (`env.py` y `main.py`) para registrar los módulos.

## 1. Respaldo local de PostgreSQL (antes de la migración)

Abre Docker Desktop. PowerShell en raíz de TSupp:

```powershell
cd C:\Users\petu7\Documents\TSupp
docker compose ps
New-Item -ItemType Directory -Force "$env:USERPROFILE\Documents\TSupp-backups" | Out-Null
docker compose exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/tsupp-pre-kb.dump'
docker cp tsupp-db:/tmp/tsupp-pre-kb.dump "$env:USERPROFILE\Documents\TSupp-backups\tsupp-pre-kb.dump"
```

Confirma que el archivo de respaldo exista y tenga tamaño mayor que cero. No copies respaldos ni contraseñas al repositorio.

## 2. Copiar el paquete

Descarga `TSupp_AI_KB_Fase1.zip` a Descargas. Desde PowerShell:

```powershell
cd C:\Users\petu7\Documents\TSupp
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\TSupp_AI_KB_Fase1.zip" -DestinationPath (Get-Location).Path
```

No utilices `-Force` sin revisar qué hay en el repositorio. Los archivos nuevos quedan en `backend/...` y esta guía en la raíz.

## 3. Dos adiciones pequeñas en archivos existentes

**A.** En `backend/alembic/env.py`, junto a los imports de modelos existentes, añade:

```python
from app.models import kb  # noqa: F401 - registrar tablas de la KB en Alembic
```

**B.** En `backend/app/main.py`, junto a los imports de routers existentes, añade:

```python
from app.api.kb import router as kb_router
```

Y junto a los `app.include_router(...)` existentes, añade:

```python
app.include_router(kb_router)
```

No reemplaces estos archivos: contienen modificaciones recientes de autenticación.

## 4. Dependencias y validaciones sin modificar PostgreSQL

```powershell
cd C:\Users\petu7\Documents\TSupp\backend
.\.venv\Scripts\python.exe -m pip install -r requirements-kb.txt
.\.venv\Scripts\python.exe -m pytest tests/test_kb_processing.py -q
.\.venv\Scripts\python.exe -m scripts.import_kb_drafts --dry-run
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic heads
```

Esperado: 3 pruebas de procesamiento pasan, 9 artículos y 112 preguntas, `current` = `c2a90610db15`, `heads` = `f37a21b9dc40`.

**No ejecutes migraciones si `heads` es distinto o contiene más de una cabeza:** eso significa que la rama evolucionó y necesitamos reconciliar revisiones.

## 5. Crear tablas y cargar solamente borradores

Una vez completado el respaldo y revisado el estado anterior:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m scripts.import_kb_drafts --importar
```

La migración crea `kb_document`, `kb_document_version`, `kb_chunk`, `kb_eval_question` y los índices vectoriales. El importador crea una primera versión **borrador** para cada artículo, más las 112 preguntas. No genera embeddings ni autoriza nada por su cuenta.

Comprueba en DBeaver:

```sql
SELECT id, status, current_version, authorized_version FROM kb_document ORDER BY id;
SELECT count(*) AS preguntas FROM kb_eval_question;
SELECT count(*) AS vectores FROM kb_chunk;
```

Esperado inmediatamente tras importar: 9 documentos en `draft`, 112 preguntas y **0 fragmentos**. Es correcto por seguridad: FR-32 exige ingestión tras autorización.

## 6. Autorizar un documento (solo si un supervisor confirma su vigencia)

El documento base MAP SIS 01 tiene revisión de enero de 2017. No uses su contenido como política vigente sin aprobación institucional explícita. El supervisor debe consultar el artículo, verificar su validez y autorizarlo mediante API.

Inicia backend desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En `http://127.0.0.1:8000/docs`:

1. Inicia sesión con `POST /api/auth/login` usando **tu usuario de supervisor legítimo**.
2. Haz clic en **Authorize** e introduce el JWT en la autenticación Bearer.
3. Consulta `GET /api/kb/documentos`, revisa título, fuente, revisión, versión y contenido con `GET /api/kb/documentos/{id}/versiones/{numero}`.
4. Solo si el supervisor confirma que el contenido aplica, usa `POST /api/kb/documentos/KB-SIS-002/autorizar`.

Esta llamada generará embeddings con `bge-m3` mediante `http://127.0.0.1:11434/api/embed`, registrará la autorización con el usuario supervisor y guardará los fragmentos vectoriales como una operación única.

Por seguridad, el importador **no transforma el campo `estado: publicado` del Markdown en autorización**.

## 7. Buscar documentos autorizados

En Swagger, manteniendo una sesión válida, ejecuta:

`GET /api/kb/buscar?q=como%20reporto%20una%20falla%20de%20computadora&limit=5`

El resultado incluye título, fragmento, versión, fuente y similitud. No es una respuesta de IA todavía.

Pruebas de autorización obligatorias antes del PR:

1. Sin JWT: `401`.
2. Como empleado, consulta un artículo no autorizado: sin resultados y sin acceso al contenido.
3. Como empleado, intenta `POST .../autorizar`: `403`.
4. Como supervisor autorizado, autoriza el artículo y confirma que aparecen embeddings.
5. Como empleado, busca y confirma que solamente aparecen artículos cuyas versiones permiten `empleado`.
6. El supervisor revoca el artículo con `POST /api/kb/documentos/{id}/revocar`, repite la búsqueda y verifica que desaparece inmediatamente.
7. Verifica que la auditoría registre `kb.document_authorized` y `kb.document_revoked`.

DBeaver después de una autorización:

```sql
SELECT d.id, d.status, d.authorized_version, count(c.id) AS fragmentos
FROM kb_document d
LEFT JOIN kb_chunk c ON c.document_id = d.id AND c.version_no = d.authorized_version
GROUP BY d.id, d.status, d.authorized_version ORDER BY d.id;
```

## Limitaciones conocidas y decisiones pendientes

- **No es todavía el asistente generativo**: faltan `/api/ia/interpretar`, `/api/ia/sugerir`, cita automática en respuesta y rechazo por umbral calibrado; no afirmes FR-39 a FR-43 cerrados.
- La búsqueda diagnostica similitud pero aún no calcula niveles Alto/Medio/Bajo validados.
- Los modelos de embeddings deben mantener la dimensión 1024; al sustituir modelo, debe reindexarse cada documento autorizado.
- La lectura de documentos en el backend está protegida por JWT y roles. **El futuro servicio IA independiente aún debe tener credencial de base de datos solo lectura**, como exige FR-45.
- La ingestión sincrónica por documento es adecuada para estos nueve textos cortos; los PDF grandes requerirán trabajos asíncronos, OCR cuando corresponda, supervisión y gestión de errores.
- No se probó conexión a tu PostgreSQL desde el entorno de generación. Validar localmente antes de PR.
- Considerar la integración con cambios simultáneos de otros integrantes y revisar `git status` antes de cualquier commit.

## Qué sigue

Fase 2: motor RAG, respuesta generada por un LLM local, umbrales calibrados, hasta tres sugerencias con citas y fallback a ticket. Fase 3: MLflow, métricas, dataset de 112 preguntas, cobertura de instalaciones, carga de PDF y pruebas adversariales.
