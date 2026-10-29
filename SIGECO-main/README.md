# SIGECO / NexusAdmin

Sistema Integrado de Gestión Corporativa para administrar equipos, documentos,
solicitudes y tickets entre áreas. Backend en Laravel 12 y frontend en React 19,
TypeScript y Vite, con PostgreSQL.

## Estructura

- `backend/`: API, autenticación, reglas de acceso, migraciones y pruebas.
- `frontend/`: aplicación web.
- `database/`: modelo de base de datos en español.
- `docs/procesos_bpmn/`: procesos por área y documentación.
- `DOCUMENTACION.md`: descripción funcional y técnica.
- `docs/SLACK.md`: configuración del bot y avisos privados por área.
- `docs/PLATAFORMA_Y_MODELO.md`: separación de roles, control de módulos y modelo de datos actualizado.
- `database/ERD_SIGECO_Actual.dbml`: esquema físico actual exportado desde PostgreSQL.

## Instalación local

Requisitos: PHP 8.3 con las extensiones requeridas por Composer y PostgreSQL,
Composer, Node.js y npm.

Para los adjuntos, configurar en el `php.ini` del servidor `upload_max_filesize = 10M` y `post_max_size = 64M`. Reiniciar PHP después del cambio. Cada archivo admite hasta 10 MB; crear solicitudes admite 5 adjuntos y registrar una acción admite 3. Estos límites de servidor se configuran en cada instalación.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Configurar `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD`
en `backend/.env`. La migración carga el esquema consolidado cuando la base está
vacía desde `backend/database/schema/pgsql-schema.sql`. No requiere importar volcados SQL manualmente.

```powershell
cd backend
php artisan migrate
php artisan serve
```

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://localhost:8000/api/v1`.
El seeder no crea cuentas de demostración a menos que se defina temporalmente
`SIGECO_SEED_PASSWORD` con una contraseña de al menos 8 caracteres. Esas cuentas
quedan obligadas a cambiarla al iniciar sesión.

## Verificación

```powershell
cd frontend
npm run build
```

```powershell
cd backend
php artisan test
```

Las pruebas usan una base separada llamada `nexus_admin_test`. Créala en PostgreSQL,
ajusta las credenciales y ejecuta una vez:

```powershell
$env:APP_ENV="testing"
$env:DB_DATABASE="nexus_admin_test"
$env:SIGECO_SEED_PASSWORD="TestOnly-12345678"
php artisan migrate:fresh --seed --force
php artisan test
```

Para producción, usa HTTPS, `APP_DEBUG=false`, una contraseña de base de datos
propia, `SESSION_SECURE_COOKIE=true` y el dominio exacto en
`CORS_ALLOWED_ORIGINS`. No definas `SIGECO_SEED_PASSWORD`. Los archivos `.env`,
dependencias, cachés y adjuntos de usuarios quedan fuera del repositorio.
