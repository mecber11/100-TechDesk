# Plataforma, administrador de empresa y módulos

Se utiliza una instalación y una base PostgreSQL independientes por empresa. El nombre de empresa es una etiqueta de configuración; no selecciona ni cambia una base de datos. Los usuarios, áreas, documentos y tickets conservan sus tablas y relaciones actuales.

| Rol | Alcance |
|---|---|
| `Plataforma_Admin` | Configurar el nombre de empresa y habilitar o deshabilitar IA, documentos y avisos Slack. No accede a tickets, equipos, usuarios ni documentos de la empresa. |
| `Administrador_Empresa` | Gestión global de usuarios, áreas, equipos, documentos habilitados y solicitudes escaladas dentro de esta instalación. No configura módulos. |
| `*_Encargado` | Gestión del equipo y las operaciones de su área. |
| `*_Equipo` | Operaciones permitidas al integrante. |

## Compatibilidad

### Panel personal y alcance de solicitudes

Todas las cuentas operativas disponen de **Mi panel**, con indicadores y últimas solicitudes creadas por ese usuario. No muestra datos de compañeros. El panel personal utiliza `/api/v1/ops?personal=1` y filtra por `solicitado_por`.

La bandeja de integrantes incluye sus propias solicitudes y las recibidas por su área. Cualquier miembro activo del equipo puede consultar el detalle y los adjuntos de las solicitudes recibidas, atenderlas, resolverlas o rechazarlas; los integrantes de TI también pueden escalarlas. El cierre de solicitudes propias atendidas o rechazadas corresponde al solicitante. Las solicitudes enviadas por otros compañeros a otra área no se comparten con integrantes del área de origen. Mi panel conserva únicamente indicadores personales. Los paneles de supervisión de área y gestión de equipos quedan reservados a encargados.

El administrador de empresa dispone de **Supervisión de empresa** (`/operacion`) para la operación global. Su panel personal sigue mostrando únicamente sus propios pedidos. El acceso documental mantiene los permisos anteriores. Las restricciones de solicitudes se aplican en el backend, además de la navegación del frontend.

`admin@ingenieros.edu.pe` conserva su contraseña y permisos operativos. La migración añade el rol `Administrador_Empresa` a los usuarios con los roles históricos `Super_Admin` o `SuperAdmin`. Los roles históricos siguen siendo alias operativos, nunca conceden acceso de plataforma. El perfil enviado al frontend presenta el nombre nuevo.

`admin_area@ingenieros.edu.pe` continúa siendo encargado de Administración. El destino de escalamiento mantiene el código `SUPER`, pero se muestra como Administrador de empresa. La plataforma usa una cuenta independiente, creada desde consola; no se distribuye una contraseña por defecto.

## Uso

Aplicar las migraciones con PHP 8.3:

```powershell
cd backend
php artisan migrate
php artisan platform:create-admin plataforma@ingenieros.edu.pe
```

El comando solicita y confirma la contraseña de forma oculta, exige al menos 8 caracteres y rechaza correos existentes. La cuenta de plataforma inicia sesión normalmente y se dirige a `/plataforma`. Allí modifica los módulos y pulsa **Guardar cambios**.

Los tres módulos comienzan habilitados. Las APIs comprueban la configuración en cada petición; la interfaz actualiza sus controles cada 15 segundos mientras está activa. Las cuentas de empresa no pueden modificar ni eliminar la cuenta de plataforma.

- **IA desactivada:** oculta el asistente flotante y el análisis de solicitudes; bloquea `/api/v1/internal-orders/assist`. El formulario manual y la atención de tickets siguen funcionando.
- **Documentos desactivados:** oculta la navegación, bloquea todas las rutas del módulo y omite su catálogo en los lookups. Los archivos y versiones permanecen guardados.
- **Slack desactivado:** no genera ni entrega avisos nuevos y pausa los pendientes. Al activarlo, los pendientes existentes se procesan con las reglas actuales; no se crean avisos retroactivos para solicitudes generadas mientras estuvo desactivado. Los IDs de Slack y su validación actual se conservan.

Las áreas, los usuarios y los pedidos son funciones básicas y no tienen un interruptor en esta versión.

## Modelo de datos

- `database/ERD_SIGECO_Actual.dbml`: modelo físico completo, exportado del catálogo PostgreSQL real; incluye claves primarias, restricciones de unicidad y relaciones. Se puede abrir en una herramienta compatible con DBML, como dbdiagram.
- `database/ERD_SIGECO_Operativo.dbml`: vista de las 20 tablas utilizadas por los módulos actuales; facilita revisar usuarios, roles, áreas, documentos, tickets, Slack y configuración. El modelo completo también conserva las tablas históricas existentes en la base.
- `database/Plataforma_Modulos.sql`: SQL de referencia para las dos tablas nuevas y la compatibilidad de roles. Para instalar se usan las migraciones Laravel, no ambos mecanismos.
- `backend/database/migrations/2026_10_12_120000_add_platform_configuration.php`: migración incremental aplicada, sin eliminar tablas ni datos operativos.

| Tabla | Campos y propósito |
|---|---|
| `cfg.configuracion_empresa` | Una fila obligatoria para la instalación (`id=1`), nombre, tres indicadores booleanos y fecha de actualización. |
| `cfg.historial_configuracion` | ID del cambio, referencia a la configuración, usuario de plataforma, valores anteriores y posteriores en JSONB y fecha. Se registra cada guardado en la misma transacción que actualiza la configuración. |
| `sec.roles` | Incorpora los roles de plataforma y administrador de empresa. |
| `sec.usuarios_roles` | Mantiene la relación entre usuarios y roles; agrega la asignación compatible a administradores existentes. |

El historial referencia `sec.usuarios.id_usuario`. Si el usuario se elimina fuera de la aplicación, el historial permanece y la referencia queda nula. La configuración se bloquea durante la actualización para serializar guardados simultáneos. Desactivar módulos no elimina ni modifica los datos del módulo.

Para regenerar el modelo tras futuras migraciones:

```powershell
cd backend
php artisan model:export
php artisan model:export --operational --output=../database/ERD_SIGECO_Operativo.dbml
```

El exportador escribe solo estructura, sin cuentas, contraseñas, tokens ni filas de negocio. El archivo DBML representa columnas, claves y relaciones; los valores por defecto y las restricciones CHECK se consultan en el esquema SQL y las migraciones.
