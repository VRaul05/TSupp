# TSupp — Portal del empleado y consola de soporte

Interfaces de `Pruebas_V3/consola-soporte-react` integradas en el frontend oficial.
Se conservan React 19, TypeScript 6, Vite 8, los scripts y las configuraciones del
repositorio. El punto de entrada carga los estilos de la consola de soporte.

## Ejecutar

Desde `frontend/`, con Node.js compatible con el Vite instalado (la integración se
verificó con Node.js 24):

```sh
npm ci
npm run dev
```

Abrir la dirección que indique Vite y elegir un rol en el acceso de demostración.
Para comprobar el proyecto:

```sh
npm run build
npm run lint
npm run preview
```

## Rutas e interfaces

| Ruta | Interfaz |
| --- | --- |
| `/soporte/acceso` | Selección de rol de demostración |
| `/soporte/tickets` | Lista, búsqueda, filtros y ordenación |
| `/soporte/registro` | Alta de ticket, formulario por subcategoría y adjuntos |
| `/soporte/tickets/:id` | Contexto, Conversación, IA y Notas |
| `/soporte/conocimiento` | Base técnica, búsqueda y filtros |
| `/soporte/conocimiento/nuevo` | Creación de borrador de artículo |
| `/soporte/conocimiento/:id` | Visor, edición, versiones y autorización de artículos |
| `/soporte/alertas`, `/soporte/perfil` | Páginas pendientes en el prototipo original |

El detalle incluye las hojas **Solicitar información**, **Registrar solución** y
**Escalar al supervisor**. Las interfaces se distribuyen entre rutas, pestañas y
hojas; no son nueve aplicaciones independientes.

## Comprobación funcional

Los tickets y artículos comienzan vacíos. No se precargan `TCK-1035` ni `KB-018`.

1. Entrar como agente, abrir Registro y crear un ticket con todos los campos
   obligatorios y el formulario de su subcategoría. Adjuntar un archivo permitido.
2. Abrir el detalle y revisar Contexto, Conversación, IA y Notas. Iniciar atención,
   agregar una nota y comprobar el adjunto tras recargar.
3. Revisar las hojas de solicitud de información, solución y escalación; usar
   tickets diferentes para probar sus transiciones. Escalar debe devolver a la
   lista y reasignar el ticket al supervisor.
4. Crear un artículo en Conocimiento, guardar una versión y acceder como
   supervisor para revisar su autorización.
5. Revisar el diseño en escritorio y móvil y el acceso directo a las rutas.

## Alcance actual

La sesión, los tickets y el conocimiento se guardan en `localStorage`. Los archivos
seleccionados se guardan localmente en IndexedDB (hasta 5 por ámbito, 10 MiB por
archivo); no se suben a un servidor. La cámara necesita localhost o HTTPS.

No hay llamadas al backend ni autenticación institucional. Los permisos del cliente,
la IA, la búsqueda semántica y las notificaciones siguen siendo demostraciones.
La opción de registrar una solución para conocimiento deja una nota; la creación
automática del artículo sigue pendiente. Alertas y Perfil también están pendientes.

El servidor de despliegue debe devolver `index.html` para las rutas del frontend
que no correspondan a archivos, porque la aplicación utiliza `BrowserRouter`.

## Criterios de integración

Se incorporan fuentes de `src`, dependencias funcionales y metadatos de la página.
Se conservan las configuraciones del frontend oficial. Se actualizan las librerías
de traducción para aceptar TypeScript 6 sin ignorar conflictos de dependencias.
El lock se actualiza desde el del destino. La rama es `chore/project-bootstrap`.

No se copian `node_modules`, `.git`, `dist`, `.env` ni archivos de compilación del
prototipo. Los estilos y recursos iniciales de Vite permanecen sin importarse.

## Integración con main y resolución del PR #6

Se conservan los dos portales en la rama `chore/project-bootstrap`:

- **Empleado:** `/login`, `/inicio`, `/mis-tickets`, `/tickets/:id`,
  `/nueva-solicitud`, `/notificaciones`, `/perfil` y demás rutas existentes de main.
- **Soporte:** `/soporte/acceso`, `/soporte/tickets`, `/soporte/registro`,
  `/soporte/conocimiento` y sus rutas de detalle.

Hay enlaces entre ambos accesos. Cada portal carga su propio router y estilos;
los enlaces entre portales recargan el documento para evitar mezclar estilos
globales. El código de soporte se encuentra en `src/support/` y el del empleado
conserva su estructura. Las sesiones y los datos locales de ambos prototipos
siguen siendo independientes: esta resolución no integra sus servicios de datos.

Se conserva React Router 7 y Lucide 1 de main, junto con las dependencias i18next
de la consola. El lock se genera mediante npm sin ignorar conflictos de peers.
Los cambios de backend/database de main se incorporan sin modificaciones manuales.

### Comprobar ambos portales

1. Abrir `/login` y comprobar el portal del empleado. La cuenta simulada de main
   es `usuario.demo@institucion.mx` / `Demo1234`.
2. Abrir el enlace «Consola de soporte (demostración)» y seleccionar un rol.
3. Crear un ticket y comprobar que sus enlaces permanecen bajo `/soporte`.
4. Recargar el detalle y volver al portal del empleado con el enlace del acceso.
5. Ejecutar `npm run build` y `npm run lint` antes de subir la resolución.