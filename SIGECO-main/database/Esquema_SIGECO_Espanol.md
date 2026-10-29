# Esquema operativo de SIGECO en español

El modelo operativo contiene 20 tablas y 31 relaciones mediante claves foráneas. Los nombres corresponden al esquema PostgreSQL real, presentado en `ERD_SIGECO_Operativo.dbml`. Cada empresa utiliza una instalación y base de datos independientes.

## Tablas

| Grupo | Tabla | Función | Clave primaria |
|---|---|---|---|
| Configuración | `cfg.configuracion_empresa` | Nombre de empresa y activación de IA, documentos y Slack. Una fila con `id=1`. | `id` |
| Configuración | `cfg.historial_configuracion` | Configuración modificada, usuario responsable, valores anteriores, posteriores y fecha. | `id_cambio` |
| Seguridad | `sec.usuarios` | Identidad, contraseña protegida, estado, área y miembro de Slack. | `id_usuario` |
| Seguridad | `sec.roles` | Roles de plataforma, administrador de empresa, encargados e integrantes. | `id_rol` |
| Seguridad | `sec.permisos` | Catálogo de permisos por módulo. | `id_permiso` |
| Seguridad | `sec.usuarios_roles` | Asignación de roles a usuarios. | `id_usuario, id_rol` |
| Seguridad | `sec.roles_permisos` | Asignación de permisos a roles. | `id_rol, id_permiso` |
| Seguridad | `sec.sesiones_usuario` | Registro de sesiones, dirección IP y agente de usuario. | `id_sesion` |
| Seguridad | `sec.tokens_acceso` | Resumen criptográfico del token, vencimiento y revocación. | `id_token` |
| Seguridad | `sec.intentos_login` | Intentos de inicio de sesión, con referencia opcional al usuario; también registra correos sin cuenta. | `id_intento` |
| Organización | `org.areas` | Áreas, código, finalidad y estado activo. | `id_area` |
| Organización | `org.miembros_area` | Integrantes de cada área e indicador de encargado. | `id_area, id_usuario` |
| Documentos | `docs.tipos_documento` | Tipos de documento. | `id_tipo_documento` |
| Documentos | `docs.documentos` | Documento, área propietaria, autor, estado y versión actual. | `id_documento` |
| Documentos | `docs.versiones_documento` | Versiones, contenido, archivo y motivo del cambio. | `id_version` |
| Solicitudes | `req.pedidos` | Pedidos y tickets: origen, destino, solicitante, prioridad, estado y atención. | `id_pedido` |
| Solicitudes | `req.detalles_pedido` | Detalles, cantidades y unidades de la solicitud. | `id_detalle` |
| Solicitudes | `req.historial_pedido` | Cambios de estado, observaciones, responsable y fecha. | `id_historial` |
| Solicitudes | `req.adjuntos_pedido` | Archivos o enlaces asociados a solicitudes y a su historial. | `id_adjunto` |
| Notificaciones | `req.avisos_slack` | Avisos de solicitudes, entrega, errores e intentos. | `id_aviso` |

## Relaciones

En cada fila, un registro de la tabla principal puede relacionarse con varios registros de la tabla dependiente (1:N). Si la clave foránea es opcional, el registro dependiente también puede existir sin esa referencia.

| Tabla principal | Tabla dependiente | Clave foránea en la dependiente |
|---|---|---|
| `cfg.configuracion_empresa` | `cfg.historial_configuracion` | `id_configuracion` |
| `sec.usuarios` | `sec.intentos_login` | `id_usuario` |
| `org.areas` | `req.avisos_slack` | `id_area_destino` |
| `docs.documentos` | `req.pedidos` | `documento_relacionado` |
| `sec.usuarios` | `req.pedidos` | `atendido_por` |
| `sec.usuarios` | `sec.usuarios` | `creado_por` |
| `sec.usuarios` | `cfg.historial_configuracion` | `id_usuario` |
| `sec.usuarios` | `docs.documentos` | `creado_por` |
| `docs.tipos_documento` | `docs.documentos` | `id_tipo_documento` |
| `org.areas` | `docs.documentos` | `id_area_propietaria` |
| `sec.usuarios` | `docs.versiones_documento` | `creado_por` |
| `docs.documentos` | `docs.versiones_documento` | `id_documento` |
| `org.areas` | `org.miembros_area` | `id_area` |
| `sec.usuarios` | `org.miembros_area` | `id_usuario` |
| `req.historial_pedido` | `req.adjuntos_pedido` | `id_historial` |
| `req.pedidos` | `req.adjuntos_pedido` | `id_pedido` |
| `sec.usuarios` | `req.adjuntos_pedido` | `cargado_por` |
| `req.pedidos` | `req.avisos_slack` | `id_pedido` |
| `req.pedidos` | `req.detalles_pedido` | `id_pedido` |
| `sec.usuarios` | `req.historial_pedido` | `modificado_por` |
| `req.pedidos` | `req.historial_pedido` | `id_pedido` |
| `org.areas` | `req.pedidos` | `area_origen` |
| `sec.usuarios` | `req.pedidos` | `solicitado_por` |
| `org.areas` | `req.pedidos` | `area_destino` |
| `sec.permisos` | `sec.roles_permisos` | `id_permiso` |
| `sec.roles` | `sec.roles_permisos` | `id_rol` |
| `sec.usuarios` | `sec.sesiones_usuario` | `id_usuario` |
| `sec.usuarios` | `sec.tokens_acceso` | `id_usuario` |
| `org.areas` | `sec.usuarios` | `id_area` |
| `sec.roles` | `sec.usuarios_roles` | `id_rol` |
| `sec.usuarios` | `sec.usuarios_roles` | `id_usuario` |

Las relaciones N:M se resuelven mediante tablas intermedias:

- **Usuarios y roles:** `sec.usuarios_roles`.
- **Roles y permisos:** `sec.roles_permisos`.
- **Usuarios y áreas:** `org.miembros_area`. Además, `sec.usuarios.id_area` identifica el área asignada directamente al usuario.

## Precisiones del modelo actual

- `cfg.configuracion_empresa` tiene una configuración única para la instalación y se relaciona con su historial mediante `id_configuracion`.
- `sec.intentos_login.id_usuario` es una clave foránea opcional: se registra para cuentas existentes y permanece nula cuando el correo no corresponde a un usuario.
- Las referencias de área de destino de Slack, documento relacionado, usuario que atiende y creador del usuario tienen claves foráneas declaradas. `documento_relacionado` usa `bigint`, igual que la clave del documento.
- Los nombres técnicos `slack_user_id` y `hash_token` se conservan para coincidir con la base: significan identificador del miembro de Slack y resumen criptográfico del token.
- El archivo completo `ERD_SIGECO_Actual.dbml` también incluye tablas históricas de otros módulos que permanecen en la base. Para revisar el funcionamiento actual de SIGECO, utiliza el modelo operativo.

El DBML incluye todas las columnas, sus tipos, campos obligatorios, claves primarias y restricciones de unicidad exportadas. La migración `2026_10_12_150000_complete_operational_relationships.php` completa las relaciones y comprueba referencias huérfanas antes de aplicar cambios.
