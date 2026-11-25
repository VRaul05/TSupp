# TSupp: paquete de autenticación, RBAC y auditoría (backend)

**Punto de partida:** la rama `main` contiene la migración `d5149ef3b2b4` y el proyecto backend que ya fue compartido. **No debe ejecutarse sobre una base diferente sin revisar primero las migraciones.**

## Alcance implementado

- Usuarios institucionales administrados en TSupp, con correo del dominio configurado, contraseña Argon2 y roles `employee`, `support_agent`, `supervisor`.
- JWT HS256 con secreto obligatorio; sesiones persistidas en PostgreSQL, cierre de sesión/revocación y límite de inactividad de 30 minutos (además de un máximo absoluto de 8 horas configurado en código).
- Bloqueo de la cuenta tras cinco intentos fallidos dentro de una ventana de 15 minutos, durante 15 minutos; auditoría de accesos.
- Restablecimiento de contraseña mediante correo institucional SMTP, token aleatorio de un solo uso (en BD se guarda solo su SHA-256), vigencia de 15 minutos, invalidación de sesiones.
- Administración de cuentas (alta, listado, cambio de rol, desactivación) y consulta de auditoría limitadas al supervisor.
- Tabla de auditoría protegida frente a UPDATE/DELETE mediante trigger PostgreSQL.
- Pruebas automatizadas del backend y workflow de GitHub Actions (unitarias + comprobación real de migraciones en PostgreSQL de CI).

## Límite oficial aún por resolver

El SRS 2.1 exige **cuentas institucionales**, pero no identifica un proveedor institucional de identidad (LDAP, SSO, OIDC u otro). Este paquete implementa **cuentas del dominio institucional administradas por TSupp** de acuerdo con el modelo `users.password_hash` y la arquitectura documentada. **No se debe afirmar que existe integración SSO institucional**. Antes de fusionarlo, el profesor o el responsable del sistema debe confirmar que se admite autenticación administrada localmente. Si exigen SSO, deberá adaptarse la capa de autenticación a ese proveedor; no inventar uno.

La interfaz de React para login y restablecimiento, la configuración SMTP institucional real y la validación de HTTPS/reverse proxy son **actividades de integración aún pendientes**, no se declaran terminadas.

## Instalación sin perder trabajo existente

1. Desde la raíz TSupp, comprobar que `main` esté actualizado y que `git status --short` no muestre archivos modificados:

   ```powershell
   cd C:\Users\petu7\Documents\TSupp
   git switch main
   git pull --ff-only origin main
   git status --short
   git switch -c feature/auth-rbac
   ```

2. **Detener Uvicorn con Ctrl+C.** Descargar `tsupp_auth_core.zip` y extraerlo **desde la raíz** de TSupp. Por ejemplo, si está en `Downloads`:

   ```powershell
   Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\tsupp_auth_core.zip" -DestinationPath (Get-Location).Path -Force
   ```

   El ZIP contiene archivos relativos `backend/...` y `.github/workflows/...`. **NO contiene `.env`, la migración anterior ni tu `database.py`.**

3. Revisar los cambios **antes de ejecutarlos**:

   ```powershell
   git status --short
   git diff --check
   git diff -- backend/app/main.py backend/app/core/config.py backend/app/models/user.py backend/alembic/env.py
   ```

   Si alguien modificó alguno de esos archivos desde el estado descrito, **no sobrescribir su trabajo**: resolver la integración conjuntamente con Omar. El paquete se preparó para los archivos que mostraste en este chat.

4. Instalar nuevas dependencias en tu entorno existente:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
   ```

5. Configurar en el `.env` **de la raíz**: `JWT_SECRET`, `INSTITUTIONAL_EMAIL_DOMAIN` (dominio oficial confirmado), y los campos `SMTP_*` para una restauración de contraseñas operativa. El archivo `ADDITIONAL_ENV_EXAMPLE.txt` solo enseña **nombres de variables**, jamás debe copiarse con sus valores de ejemplo como producción. Genera el secreto de forma local:

   ```powershell
   .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

   No compartir el secreto en chats, documentación ni Git.

6. Revisar la migración `c2a90610db15_auth_sessions_and_audit.py`, su dependencia `d5149ef3b2b4` y que tus datos no estén en un esquema inesperado. Aplicar desde `backend`:

   ```powershell
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m alembic current
   .\.venv\Scripts\python.exe -m alembic check
   ```

7. Ejecutar pruebas (se usa SQLite aislado para unitarias y PostgreSQL real en CI para comprobar migraciones):

   ```powershell
   .\.venv\Scripts\python.exe -m pytest tests -q
   ```

8. Crear **una sola vez** el primer supervisor mediante contraseña no visible en pantalla:

   ```powershell
   .\.venv\Scripts\python.exe -m scripts.create_supervisor
   ```

   Se solicita nombre, correo institucional y contraseña. No hay contraseñas predeterminadas.

9. Arrancar el servidor:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   En `/docs` comprobar `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/admin/users`, `/api/admin/audit`, `/api/auth/password-reset/request` y `/api/auth/password-reset/confirm`. Para restablecer contraseña es obligatoria la configuración SMTP auténtica y posteriormente la página React designada por el equipo.

10. Revisar todo mediante PR y CI; **no** incorporar a `main` hasta obtener revisión y pruebas satisfechas:

   ```powershell
   git status --short
   git diff --check
   git add backend/app backend/alembic/env.py backend/alembic/versions/c2a90610db15_auth_sessions_and_audit.py backend/requirements-auth.txt backend/requirements-dev.txt backend/scripts backend/tests .github/workflows/backend-auth.yml
   git commit -m "feat(auth): add institutional account security and audit foundation"
   git push -u origin feature/auth-rbac
   ```

   Tras revisión, configurar protección de `main` para exigir al menos una aprobación y los checks de CI. Verificar los checks **desde GitHub**; no asumir éxito porque se incluyó un YAML.

## Archivos modificados del repositorio existente

- `backend/app/main.py`: agrega routers; conserva los endpoints de salud.
- `backend/app/core/config.py`: conserva `database_url` y `frontend_origin`, agrega variables obligatorias de seguridad y correo.
- `backend/app/models/user.py`: conserva las seis columnas ya migradas y agrega contadores de intentos, ventana y bloqueo.
- `backend/alembic/env.py`: importa todos los modelos para la autogeneración.

## Restricciones de seguridad

- JWT y contraseñas nunca aparecen en la bitácora de auditoría.
- Las rutas de administración verifican permisos en el backend.
- El bloqueo de cuenta es persistente.
- No utilizar cuentas reales ni datos institucionales sensibles para pruebas automatizadas.
- La prueba automatizada usa credenciales ficticias solamente en el contexto aislado de tests.
- Los mecanismos de seguridad y de envío de correos deben probarse con el proveedor institucional y bajo HTTPS antes del despliegue real.

## Trazabilidad

SRS 2.1: FR-01, FR-24, NFR-01, NFR-02, NFR-05, NFR-17, NFR-23; arquitectura del 4 de octubre de 2026: módulos Auth/RBAC, auditoría y contratos API. **Es una implementación propuesta que requiere revisión del equipo**, no una afirmación de aprobación institucional o funcionamiento en el repositorio remoto.
