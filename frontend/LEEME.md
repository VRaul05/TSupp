# Frontend – Mesa de Ayuda (portal del empleado)

Pantallas incluidas (versión móvil completa; versión web en progreso):
- **Login** (normal, error de credenciales, cuenta bloqueada)
- **Aviso de privacidad** (primer inicio)
- **Inicio del empleado** (saludo, búsqueda, categorías, tickets activos, navegación inferior)
- **Nueva solicitud** en 3 pasos (categoría → detalles → descripción y evidencias)
- **Sugerencias de la IA** (analizando → sugerencias con fuente y confianza)
- **Sin sugerencia confiable** → crear ticket o volver a editar la solicitud
- **¡Qué bueno que se resolvió!** con calificación opcional (no se crea ticket)
- **Tu ticket fue creado** con el resumen de lo que se envió
- **Mis solicitudes**: pestañas Activas / Historial y panel de filtros (estado y fecha)
- **Detalle del ticket**: línea de estados, estimaciones, detalles, conversación y caja para responder
  - Estados: Recibido, En cola, En proceso, Esperando tu respuesta, Resuelto, Cerrado, Cancelado
  - Acciones: responder al técnico, confirmar o reabrir un ticket resuelto, cancelar
  - Resuelto: solución del técnico con adjuntos, cierre automático en 5 días hábiles si no respondes
  - "No se resolvió": motivo obligatorio (mín. 10 caracteres) y captura opcional
  - Cerrado: calificación del servicio y opción de reabrir durante 10 días naturales
- **Notificaciones**: todas / no leídas, filtro por tipo, marcar todas como leídas
- **Perfil**: datos del empleado, preferencias (correo y push), aviso de privacidad, derechos ARCO y cerrar sesión

### Flujo
```
Nueva solicitud → Sugerencias IA ─┬─ "Esto resolvió mi problema" → Resuelto + calificación (sin ticket)
                                  ├─ "Necesito más ayuda"        → Ticket creado
                                  └─ sin sugerencias             → Crear ticket / Volver a mi solicitud
```

## Cómo ponerlo en tu proyecto

**Si tu carpeta `frontend` está vacía:** copia todo el contenido de este zip dentro de `frontend`.

**Si tu carpeta `frontend` ya tiene un proyecto de Vite:** copia solo la carpeta `src` y el `index.html`
(reemplazando los que tengas), y luego instala las dos librerías nuevas:

```powershell
npm install react-router-dom lucide-react
```

Después, como siempre:

```powershell
cd frontend
npm install
npm run dev
```

Abre la dirección que te muestre (normalmente http://localhost:5173).

## Cómo probar los estados

| Quiero ver… | Haz esto |
|---|---|
| Login normal | Abre la página |
| Error de credenciales | Escribe cualquier correo válido con una contraseña incorrecta |
| Cuenta bloqueada | Equivócate 3 veces con el mismo correo |
| Aviso de privacidad | Entra con `usuario.demo@institucion.mx` / `Demo1234` (solo sale la primera vez) |
| Inicio | Acepta el aviso |
| Nueva solicitud | Botón naranja "Nueva solicitud", una tarjeta de categoría o escribe en la búsqueda y presiona Enter |
| Archivo rechazado | En el paso 3 adjunta un archivo de más de 10 MB o un .mp4 |
| Sugerencias | Categoría TI con cualquier subcategoría, o Edificio con Iluminación o Aire acondicionado |
| Sin sugerencia confiable | Categoría "Otro", o Edificio con Plomería, Mobiliario, Cerraduras o Salones |
| Mis solicitudes | Pestaña "Mis solicitudes" en la barra inferior |
| Notificaciones | Campana del inicio o pestaña "Notificaciones" |
| Derechos ARCO | Perfil → "Solicitar acceso o corrección de mis datos" |
| Esperando tu respuesta | Abre el ticket #TK-1042 y presiona "Responder ahora" |
| Resuelto / No se resolvió | Abre el ticket #TK-1031 |
| Cerrado (se puede reabrir) | Abre el ticket #TK-1007 en Historial |
| Cerrado (plazo vencido) | Abre el ticket #TK-0985 en Historial |
| Cancelar | Abre el ticket #TK-1082 y presiona "Cancelar ticket" |
| Empezar de cero | Perfil → "Reiniciar datos de demostración" (hazlo al actualizar a una versión nueva) |



## Estructura

```
src/
  styles/tokens.css     ← paleta, tipografía y medidas (cambia colores AQUÍ)
  styles/global.css     ← estilos base y layout mobile-first
  components/           ← piezas reutilizables (botón, campo, alerta, encabezado…)
  pages/                ← pantallas completas
  pages/new-request/    ← los 3 pasos de "Nueva solicitud"
  services/authService.ts   ← login SIMULADO
  pages/suggestions/    ← pantalla de sugerencias y sus estados
  pages/my-requests/    ← Mis solicitudes y filtros
  pages/ticket-detail/  ← detalle del ticket y conversación
  services/ticketService.ts ← solicitudes y tickets SIMULADOS (catálogos, reglas de archivos)
  services/aiService.ts     ← IA SIMULADA con una base de conocimiento de ejemplo
  services/notificationService.ts ← notificaciones, preferencias y ARCO SIMULADOS
  pages/notifications/  ← Notificaciones
  pages/profile/        ← Perfil y derechos ARCO
  components/web/       ← estructura web: barra superior, menú de usuario y pie
  pages/home-web/       ← inicio en computadora
  pages/new-request/NewRequestWeb.tsx ← nueva solicitud en computadora (todo en una página)
  pages/suggestions/SuggestionsWeb.tsx ← sugerencias en computadora
  pages/my-requests/MyRequestsWeb.tsx  ← mis solicitudes en computadora (tabla + detalle rápido)
  pages/ticket-detail/TicketDetailWeb.tsx ← detalle del ticket en computadora
  pages/notifications/NotificationsWeb.tsx ← centro de notificaciones en computadora
  pages/profile/ProfileWeb.tsx ← perfil en computadora
  pages/privacyNotice.ts ← TEXTO del aviso de privacidad (compartido por celular y web)
  pages/PrivacyNoticeWeb.tsx ← aviso de privacidad (consulta) en computadora
  pages/TicketCreatedWeb.tsx ← "Tu ticket fue creado" en computadora
  pages/ResolvedWeb.tsx ← "¡Qué bueno que se resolvió!" en computadora
  components/web/receipt.ts ← comprobante imprimible / PDF
```

## Pendientes
- Conectar `authService.ts`, `ticketService.ts` y `aiService.ts` con los endpoints reales del backend.
- Conectar `notificationService.ts` (notificaciones, preferencias y ARCO) con el backend.
- Las notificaciones push solo piden el permiso del navegador; el envío real lo hace el servidor.
- Versión web (desde 1024 px): hechas login, inicio, nueva solicitud, sugerencias de la IA y
  mis solicitudes (tabla con filtros, CSV y comprobante), detalle del ticket (todos los
  estados, con comprobante PDF y métricas al cerrar), centro de notificaciones (más el menú
  de la campana), perfil, "¡Qué bueno que se resolvió!", "Tu ticket fue creado" y aviso de privacidad
  (consulta con índice, impresión y ARCO). ¡Versión web completa!
- El comprobante "PDF" abre la ventana de impresión del navegador; ahí se elige "Guardar como PDF".
- El formulario web pide además impacto, número de inventario y sede para todas las categorías;
  el de celular no. Confirmar con el equipo si el celular también debe pedirlos.
- El texto del aviso de privacidad es un borrador: debe validarlo el área jurídica del DIF.
- Botón "Acceder con cuenta de red institucional" sin funcionalidad todavía.
