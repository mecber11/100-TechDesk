# SIGECO / NexusAdmin

Sistema Integrado de Gestión Corporativa para administrar equipos, documentos,
solicitudes y tickets entre áreas. Backend en Laravel 12 y frontend en React 19,
TypeScript y Vite, con PostgreSQL.

## Estructura

- `backend/`: API, autenticación, reglas de acceso, arquitectura hexagonal (Domain, Data, Business, Http), migraciones y pruebas.
- `frontend/`: aplicación web React 19 / TypeScript con soporte standalone offline en IndexedDB.
- `database/`: modelo de base de datos en español y diagramas DBML (`database/ERD_SIGECO_Operativo.dbml`).
- `docs/techdesk/`: informe técnico de verificación y resultados (`docs/techdesk/RESULTADOS_VERIFICACION.md`).
- `docs/procesos_bpmn/`: procesos por área y documentación.
- `DOCUMENTACION.md`: descripción funcional y técnica.
- `docs/SLACK.md`: configuración del bot y avisos privados por área.
- `docs/PLATAFORMA_Y_MODELO.md`: separación de roles, control de módulos y modelo de datos actualizado.
- `database/ERD_SIGECO_Actual.dbml`: esquema físico actual exportado desde PostgreSQL.

## Módulo TechDesk (Semana 10) — Correcciones y Observaciones

El módulo **TechDesk** implementa una gestión integral de infraestructura y soporte TI con las siguientes capacidades auditadas:

1. **Normalización y Unicidad de Identificadores Físicos:**
   - Soporte para MAC (`XX:XX:XX:XX:XX:XX` normalizado a 12 hex), IMEI (15 dígitos numéricos), Serie y ServiceTag.
   - Índice parcial único en base de datos para garantizar unicidad por emisor/fabricante sin colisiones.

2. **Gestión de Fotografías con Reutilización y Desvinculación:**
   - Carga de imágenes JPEG/PNG/WebP hasta 5 MB con hash SHA-256 para deduplicación.
   - Galería de fotos reusables por lote o modelo y posibilidad de desvincular sin borrado destructivo.
   - En modo Demo, almacenamiento directo en IndexedDB como Data URLs para persistencia total.

3. **Dashboard de Valoración Contable y Depreciación Técnica:**
   - Amortización lineal mensual exacta según el día de adquisición (aniversario calendario).
   - Ajuste exacto de fin de mes (adquisición 31 de enero cumple 1 mes de depreciación el 28 de febrero; el 27 de febrero registra 0 meses).
   - KPIs financieros en tiempo real: Adquisición total, Valor en libros residual, Depreciación acumulada, y distribución por tipo, estado y área.

4. **Trazabilidad de Préstamos y Asignaciones:**
   - Contadores en tiempo real (Total, En Préstamo, Devueltos, Por Vencer ≤ 48h, Vencidos).
   - Filtros combinados por estado, plazo, tipo de activo, área solicitante y rango de fechas.
   - Exportación completa a CSV con protección contra inyección de fórmulas (`'`, `=`, `+`, `-`, `@`).
   - Derivación automática a Mantenimiento con orden correctiva si el activo se devuelve en condición "Dañado".

5. **Mantenimiento TI:**
   - Flujo de estados estricto: `Programado` -> `EnProceso` -> `Completado` o `Cancelado`.
   - Bloqueo de asignación cuando el equipo está en proceso de atención.
   - Validación obligatoria de diagnóstico técnico y técnico responsable para completar la ficha.

6. **Monitoreo Algorítmico de SLAs:**
   - Políticas con horas fraccionarias (ej. 1.5h = 90 minutos de tolerancia).
   - Separación de marcas temporales de primera respuesta y resolución.
   - Bandeja persistente de alertas de riesgo y vencimiento en encabezado.

7. **Modo Demo Autónomo (IndexedDB):**
   - Ejecución 100% en el navegador (`VITE_DEMO_MODE=true`) sin requerir servidor backend ni base PostgreSQL.
   - Base de datos IndexedDB `SIGECO_TECHDESK_DEMO_V2` con fixtures de prueba listos.
   - Botón "Restablecer Demo" en el encabezado para retornar al estado inicial en cualquier momento.

---

## Instalación local

Requisitos: PHP 8.3 con las extensiones requeridas por Composer y PostgreSQL (`pdo_pgsql`, `pdo_sqlite`, `curl`, `mbstring`, `fileinfo`, `gd`, `zip`), Composer, Node.js y npm.

Para los adjuntos, configurar en el `php.ini` del servidor `upload_max_filesize = 10M` y `post_max_size = 64M`. Reiniciar PHP después del cambio. Cada archivo admite hasta 10 MB; crear solicitudes admite 5 adjuntos y registrar una acción admite 3. Estos límites de servidor se configuran en cada instalación.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Configurar `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD`
en `backend/.env`. La migración carga el esquema consolidado cuando la base está
vacía desde `backend/database/schema/pgsql-schema.sql` y las migraciones aditivas de TechDesk.

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

---

## Verificación y Pruebas Unitarias

### Compilación Frontend
```powershell
cd frontend
npm run build
```
*(Compila sin errores con `tsc -b && vite build`)*

### Pruebas Unitarias de Arquitectura y Lógica TechDesk (PHPUnit)
```powershell
cd backend
vendor/bin/phpunit tests/Unit
```
*(15 tests, 220 assertions pasando al 100%)*

Para más detalles sobre los casos de verificación AC01–AC50, consultar el informe completo en:
[`docs/techdesk/RESULTADOS_VERIFICACION.md`](docs/techdesk/RESULTADOS_VERIFICACION.md).
