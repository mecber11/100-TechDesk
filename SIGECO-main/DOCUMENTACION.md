# SIGECO - Documentación técnica

SIGECO administra áreas, integrantes, documentos institucionales y solicitudes internas de 100% Ingenieros. La API utiliza Laravel 12 y PHP 8.3; la interfaz utiliza React 19, TypeScript y Vite; la persistencia utiliza PostgreSQL.

## Estructura

- `backend/app/Http/`: controladores, validación y middleware.
- `backend/app/Business/`: reglas de autenticación, áreas, equipos, solicitudes y documentos.
- `backend/app/Data/`: contratos, consultas y transacciones.
- `backend/app/Domain/`: entidades utilizadas por los módulos activos.
- `backend/database/`: esquema consolidado, migraciones y seeders.
- `backend/tests/`: pruebas de arquitectura, permisos y flujos operativos.
- `frontend/src/features/`: pantallas de los módulos operativos y paneles por área.
- `frontend/src/shared/`: navegación, agente de solicitudes y componentes comunes.
- `database/ERD_NexusAdmin_Espanol.dbml`: modelo de base de datos en español.
- `docs/procesos_bpmn/`: procesos por área, diagramas e informe de procesos.
- `scripts/`: generación de los modelos de procesos.

El backend es una API; su ruta `/` devuelve el estado de SIGECO. La interfaz se sirve desde `frontend/`.

## API

Todos los endpoints utilizan el prefijo `/api/v1`.

| Recurso | Función |
| --- | --- |
| `/auth` | Registro, sesión, contraseña y usuario actual. |
| `/lookups` | Catálogos para los formularios. |
| `/ops` | Indicadores y actividad según la visibilidad del usuario. |
| `/areas`, `/users` | Administración de áreas y cuentas para SuperAdmin. |
| `/team` | Aprobación, suspensión, reactivación y eliminación de integrantes. |
| `/internal-orders` | Solicitudes, transiciones y evidencias. |
| `/internal-orders/assist` | Clasificación local por el agente. |
| `/documents` | Registro, consulta y eliminación de documentos. |
| `/documents/{id}/file` | Descarga; `?preview=1` permite presentación en línea. |
| `/documents/{id}/publish`, `/obsolete`, `/versions` | Publicación, obsolescencia y versiones. |
| `/techdesk/assets` | Inventario, catálogo, stock y ficha técnica de hardware TI. |
| `/techdesk/assignments` | Asignación dinámica de equipos, préstamos y devoluciones. |
| `/techdesk/maintenances` | Registro de mantenimiento preventivo y correctivo por equipo. |
| `/techdesk/sla/policies` | Configuración de acuerdos de nivel de servicio (SLAs). |
| `/techdesk/sla/dashboard` | Radar y temporizadores en tiempo real de cumplimiento de SLAs. |
| `/techdesk/my-assets` | Consulta de hardware asignado para cualquier usuario. |

## Reglas operativas

- Cada área consulta las solicitudes enviadas y recibidas. TI y SuperAdmin tienen visibilidad global y pueden filtrar por área.
- Las solicitudes pueden dirigirse a otra área activa. Solo TI puede escalar al SuperAdmin.
- El flujo habitual es `Enviado → EnAtencion → Atendido → Cerrado`: el destinatario atiende y el origen confirma el cierre.
- **100% TechDesk**: El área de TI cuenta con una suite integral para la gestión de activos tecnológicos, control de préstamos a colaboradores con devolución automatizada, fichas técnicas con cálculo de depreciación y ciclo de vida, historial de mantenimientos preventivos y correctivos, y medición algorítmica de Acuerdos de Nivel de Servicio (SLAs) con temporizadores y alertas en tiempo real.
- El agente clasifica la solicitud; el backend asigna al miembro autenticado como solicitante. El pedido conserva su nombre y correo aunque se elimine la cuenta.
- Cada encargado gestiona su equipo. Las suspensiones tienen un plazo de reactivación de 60 días antes de la eliminación automática.
- Administración, TI y SuperAdmin acceden a documentación con visibilidad según su área o rol global.
- Los adjuntos documentales admiten PDF, Word, Excel, PowerPoint, JPG y PNG, hasta 10 MB. Se guardan en la primera versión.
- PDF e imágenes tienen vista previa. Otros formatos se descargan para abrirlos en su aplicación.
- Cerrar el formulario limpia los campos y el archivo. Eliminar un documento retira sus versiones y archivos, salvo restricciones por registros relacionados.
- Slack es obligatorio para nuevos registros. Cada ticket genera un aviso privado solo para el encargado activo del área destinataria; los errores quedan pendientes para reintento. Ver `docs/SLACK.md` para activar el bot.

## Instalación

Consultar `README.md` para requisitos, instalación y preparación de la base de pruebas. Las instalaciones nuevas cargan `backend/database/schema/pgsql-schema.sql` mediante migraciones; no requieren volcados históricos.

Las dependencias locales, archivos `.env`, cachés y adjuntos se excluyen de Git. Los archivos de bloqueo se conservan para reproducir la instalación.
