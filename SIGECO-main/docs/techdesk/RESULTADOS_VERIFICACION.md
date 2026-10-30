# Informe Técnico de Verificación y Validación de Observaciones — TechDesk (Semana 10)

**Proyecto:** SIGECO — Plataforma de Gestión Corporativa (Módulo TechDesk / TI)  
**Repositorio:** `mecber11/100-TechDesk`  
**Rama de Entrega:** `feature/techdesk-semana-10`  
**Commit Base:** `754447e22036f0aa70d434c0084ed789a9004a27`  
**Fecha de Verificación:** 29 de Octubre de 2026  
**Responsable Técnico:** Equipo de Desarrollo Nexus / TechDesk (100% Ingenieros)  

---

## 1. Resumen Ejecutivo

En cumplimiento de las observaciones y requerimientos presentados por el docente para la entrega de la **Semana 10** del módulo **TechDesk**, se completó la refactorización arquitectónica, implementación funcional y endurecimiento de la plataforma en los tres pilares del sistema:
1. **Backend:** Laravel 12 / PHP 8.3 / PostgreSQL 16 con arquitectura hexagonal estricta de 4 capas (`Domain` -> `Data` -> `Business` -> `Http`), verificada por tests de frontera.
2. **Frontend:** React 19 / TypeScript / Vite 6.4 / TailwindCSS con interfaces reactivas para inventario con fotos, dashboard de valoración de activos, trazabilidad de préstamos, mantenimientos y control algorítmico de SLAs.
3. **Modo Demo Autónomo:** Persistencia offline completa basada en **IndexedDB** (`SIGECO_TECHDESK_DEMO_V2`), que replica todas las operaciones de backend sin requerir servidor PHP ni PostgreSQL activo, sobreviviendo recargas de página y permitiendo restablecimiento instantáneo a los fixtures de prueba.

---

## 2. Entorno de Ejecución y Dependencias

| Componente | Versión | Estado |
|---|---|---|
| **PHP Runtime** | PHP 8.3.10 (cli) (ZTS Visual C++ 2019 x64) | Operativo con extensiones `pdo_pgsql`, `pdo_sqlite`, `curl`, `mbstring`, `fileinfo`, `gd`, `zip` |
| **Laravel Framework** | 12.x | Configurado con arquitectura de capas desacopladas |
| **PHPUnit** | 11.5.56 | 15 pruebas unitarias / 220 aserciones (100% exitosas) |
| **Node.js** | v20+ / npm v10+ | Compilación `tsc -b && vite build` completada en 5.86s (0 errores) |
| **Frontend Framework** | React 19.0.0, Vite 6.4.3, TailwindCSS, TanStack Query | Compilado en bundle de producción |
| **Persistencia Demo** | IndexedDB API v2 | Object stores: `assets`, `asset_images`, `assignments`, `maintenances`, `sla_policies`, `notifications`, `meta` |

---

## 3. Matriz de Cumplimiento de Criterios de Aceptación (AC01 – AC50)

### Módulo TD01: Normalización y Unicidad de Identificadores Físicos
- **AC01 [APROBADO]:** Selección de tipo de identificador físico externo (`MAC`, `IMEI`, `Serie`, `ServiceTag`, `Otro`, `Ninguno`).
- **AC02 [APROBADO]:** Normalización automática de direcciones MAC al formato canónico `XX:XX:XX:XX:XX:XX` en mayúsculas hex (12 dígitos).
- **AC03 [APROBADO]:** Validación estricta de formato IMEI a 15 dígitos numéricos.
- **AC04 [APROBADO]:** Normalización de ServiceTag / Serie eliminando espacios redundantes y preservando formato alfanumérico.
- **AC05 [APROBADO]:** Rechazo de cadenas vacías o valores placeholder inválidos (`N/A`, `none`, `-`, `null`).
- **AC06 [APROBADO]:** Índice parcial único en base de datos (`idx_activos_identificador_emisor_unique`) para evitar duplicados por emisor/fabricante.

### Módulo TD02: Carga, Reutilización y Desvinculación de Fotografías
- **AC07 [APROBADO]:** Subida de fotografías en formatos JPEG, PNG y WebP con validación de límite de 5 MB.
- **AC08 [APROBADO]:** Cálculo automático de hash SHA-256 para detección y deduplicación de imágenes idénticas.
- **AC09 [APROBADO]:** Almacenamiento desacoplado en tabla `ti.imagenes_activo` permitiendo asociación N:1 (reutilización de una misma foto en múltiples activos del mismo lote o modelo).
- **AC10 [APROBADO]:** Modal de "Galería de Fotos Reutilizables" para seleccionar imágenes previamente subidas.
- **AC11 [APROBADO]:** Capacidad de desvincular fotografía sin eliminar físicamente el activo ni la imagen compartida.
- **AC12 [APROBADO]:** En modo Demo, almacenamiento de imágenes como Data URLs / Blobs en IndexedDB para persistencia entre recargas.

### Módulo TD03: Dashboard de Valoración Contable y Depreciación Técnica
- **AC13 [APROBADO]:** Cálculo de depreciación lineal mensual exacta basada en el día de adquisición (aniversario calendario).
- **AC14 [APROBADO]:** Ajuste exacto de fin de mes (ej. adquisición 31 de enero -> cumple 1 mes de uso el 28 de febrero; el 27 de febrero registra 0 meses).
- **AC15 [APROBADO]:** Validación de fixtures exactos del docente:
  - Activo HP A (S/. 3,600.00, 36 meses, adquisición 2026-01-15, corte 2026-10-29): 9 meses transcurridos, depreciación mensual S/. 100.00, depreciación acumulada S/. 900.00, valor residual **S/. 2,700.00**.
  - Activo HP B (S/. 1,800.00, 36 meses, adquisición 2026-04-15, corte 2026-10-29): 6 meses transcurridos, depreciación mensual S/. 50.00, depreciación acumulada S/. 300.00, valor residual **S/. 1,500.00**.
  - Total inicial combinado: **S/. 5,400.00** valor de adquisición, **S/. 4,200.00** valor en libros.
  - Incorporación de Activo C (S/. 1,000.00): Total adquisición sube a **S/. 6,400.00**.
  - Retiro / Baja de Activo B: Total adquisición desciende a **S/. 4,600.00**.
- **AC16 [APROBADO]:** Panel de KPIs: Valor Total de Adquisición, Valor en Libros Actual, Depreciación Acumulada, Activos Valorados, Activos Pendientes de Valoración, y Activos Totalmente Depreciados.
- **AC17 [APROBADO]:** Distribuciones analíticas por Tipo de Activo, por Estado Operativo y por Área Organizacional.
- **AC18 [APROBADO]:** Modal detallado de activos con valoración pendiente justificando el motivo (falta de costo o fecha).
- **AC19 [APROBADO]:** Actualización reactiva instantánea ante adición, edición o baja de activos.

### Módulo TD04: Filtros Combinados de Préstamos y Asignaciones
- **AC20 [APROBADO]:** Búsqueda de texto libre por colaborador, correo, código patrimonial y nombre de equipo.
- **AC21 [APROBADO]:** Filtro por Estado (`Activo`, `Devuelto`, `Todos`).
- **AC22 [APROBADO]:** Filtro por Vencimiento de Plazo (`vigente`, `por_vencer` [≤ 48 horas], `vencido`).
- **AC23 [APROBADO]:** Filtro por Tipo de Activo tecnológico (Laptop, Desktop, etc.).
- **AC24 [APROBADO]:** Filtro por Área Solicitante y Área Destino física.
- **AC25 [APROBADO]:** Rango de fechas de asignación (`date_from` y `date_to`).

### Módulo TD05: Contadores Resumen y Exportación CSV
- **AC26 [APROBADO]:** Endpoint `/techdesk/assignments/summary` con contadores en tiempo real (Total, En Préstamo, Devueltos, Por Vencer ≤ 48h, Vencidos).
- **AC27 [APROBADO]:** Exportación completa de asignaciones filtradas a archivo CSV mediante botón "Exportar CSV".
- **AC28 [APROBADO]:** Sanitización rigurosa contra CSV Injection (anteposición de apóstrofe `'` a campos que inicien con `=`, `+`, `-`, `@`, `\t`, `\r`).

### Módulo TD06: Corrección de Contratos de Usuarios, Áreas y Pedidos
- **AC29 [APROBADO]:** Campo explícito `id_area_solicitante` agregado a la tabla `ti.asignaciones_activo`.
- **AC30 [APROBADO]:** Endpoint unificado de lookups `/techdesk/assignments/lookups` con stock disponible, colaboradores, áreas y órdenes vinculadas.
- **AC31 [APROBADO]:** Eliminación de discrepancias de nombres entre backend y frontend (`nombre_completo`, `requesting_area`, etc.).

### Módulo TD07: Integridad y Concurrencia en Préstamos
- **AC32 [APROBADO]:** Uso de `lockForUpdate` en backend durante la creación de asignaciones para evitar asignaciones dobles simultáneas.
- **AC33 [APROBADO]:** Validación de disponibilidad física previa (el activo debe estar en estado `Disponible`).
- **AC34 [APROBADO]:** En devolución de equipo en condición `Dañado`, derivación automática del activo a estado `Mantenimiento` con registro preventivo/correctivo automático.

### Módulo TD08: Flujo y Restricciones de Transiciones de Mantenimiento
- **AC35 [APROBADO]:** Máquina de estados: `Programado` -> `EnProceso` -> `Completado` o `Cancelado`.
- **AC36 [APROBADO]:** Bloqueo de activo mientras el mantenimiento esté `EnProceso` (no se puede asignar a colaboradores).
- **AC37 [APROBADO]:** Validación obligatoria de técnico responsable y diagnóstico/solución técnica al transicionar a `Completado`.
- **AC38 [APROBADO]:** Prohibición de eliminación de mantenimientos que se encuentren en curso (`EnProceso`).

### Módulo TD09: Ficha Técnica Digital Completa
- **AC39 [APROBADO]:** Visualización de especificaciones de hardware (CPU, RAM, Disco, Sistema Operativo).
- **AC40 [APROBADO]:** Visualización de fotografía del equipo en alta resolución.
- **AC41 [APROBADO]:** Barra interactiva de ciclo de vida con porcentaje de depreciación acumulada y meses restantes.
- **AC42 [APROBADO]:** Tabla de Historial Completo de Asignaciones y Préstamos vinculados al equipo.
- **AC43 [APROBADO]:** Tabla de Historial Completo de Mantenimientos y Reparaciones técnicas del equipo.

### Módulo TD10: Monitoreo Algorítmico de SLAs y Alertas
- **AC44 [APROBADO]:** Soporte para horas fraccionarias en políticas de SLA (ej. 1.5 horas = 90 minutos de resolución).
- **AC45 [APROBADO]:** Distinción explícita de hitos temporales: hora de creación, hora de primera respuesta y hora de resolución final.
- **AC46 [APROBADO]:** Generación persistente y deduplicada de notificaciones de riesgo (`sla_riesgo`) y vencimiento (`sla_vencido`) en tabla `ti.notificaciones_techdesk`.
- **AC47 [APROBADO]:** Campana interactiva de alertas en el encabezado con contador de no leídas y acción "Marcar como leído".

### Módulo TD11: Persistencia Offline en IndexedDB (Modo Demo)
- **AC48 [APROBADO]:** Modo Demo 100% operativo sin dependencias de red ni backend local cuando `VITE_DEMO_MODE=true`.
- **AC49 [APROBADO]:** Inicialización automática de IndexedDB con los fixtures de prueba del profesor.
- **AC50 [APROBADO]:** Botón "Restablecer Demo" para recargar el estado inicial limpio en cualquier momento.

---

## 4. Resultados de Pruebas Automatizadas

### Pruebas Unitarias de Backend (`tests/Unit`)
Ejecutadas con PHPUnit 11.5.56 sobre PHP 8.3.10:
```text
...............                                                   15 / 15 (100%)

Time: 00:00.377, Memory: 38.00 MB
OK (15 tests, 220 assertions)
```

Detalle de Suites de Pruebas:
1. **`LayerArchitectureTest` (2 tests, 163 assertions):**
   - Verifica que los controladores en `App\Http` no importen clases de `App\Domain`, `App\Data`, ni llamen a facades directas de base de datos (`DB::`, `::query(`).
   - Verifica que los servicios de negocio en `App\Business` dependan exclusivamente de interfaces y no llamen directamente a `DB::` ni métodos de infraestructura.
2. **`AssetIdentificationAndValuationTest` (6 tests, 27 assertions):**
   - Normalización de direcciones MAC (minúsculas, mayúsculas, separadores de guión/punto).
   - Validación y rechazo de IMEI inválido (< 15 dígitos o alfanumérico).
   - Normalización de ServiceTags y rechazo de placeholders vacíos (`N/A`, `none`, `-`).
   - Cálculo exacto de depreciación lineal mensual por aniversario de calendario (caso 31 de enero vs 28 de febrero).
   - Verificación de balance financiero con fixtures del docente: HP A (S/. 3,600.00), HP B (S/. 1,800.00), Total S/. 5,400.00, adición de C (S/. 6,400.00), y retiro de B (S/. 4,600.00).
3. **`SlaCalculationTest` (3 tests, 18 assertions):**
   - Cálculo con horas fraccionarias (1.5 horas = 90 minutos de tolerancia).
   - Verificación de hitos del caso de prueba Sección 13.3 (creación 09:00, primera respuesta 09:30, límite resolución 11:00, vencimiento a las 12:00).
   - Deduplicación de alertas en bandeja de notificaciones de SLA.
4. **`AssetAssignmentAndMaintenanceRulesTest` (4 tests, 12 assertions):**
   - Reglas de asignación y bloqueo de activos no disponibles.
   - Derivación automática de activos devueltos dañados a mantenimiento.
   - Restricciones de transición de estado en mantenimientos (requisito de técnico y diagnóstico al completar).

---

## 5. Guía Rápida de Demostración para el Docente

Para demostrar y auditar todas las funcionalidades de manera inmediata:

### Opción A: Modo Demo Autónomo (Recomendado para evaluación offline)
1. Abrir una terminal en `frontend/` y ejecutar:
   ```bash
   npm run dev
   ```
2. Abrir el navegador en `http://localhost:5173`.
3. Navegar al módulo **TechDesk** en el menú lateral.
4. **Demostración de Pestañas:**
   - **Inventario de Activos:** Registrar un nuevo activo subiendo una foto (o seleccionando una de la galería reusable), elegir identificador físico (ej. MAC `a1b2c3d4e5f6`) y verificar cómo se normaliza a `A1:B2:C3:D4:E5:F6`. Abrir la "Ficha Técnica" para revisar las especificaciones de hardware, historial de asignaciones e historial de mantenimientos.
   - **Valoración y Depreciación:** Observar el tablero contable con los activos HP A y HP B totalizando S/. 5,400.00 de adquisición. Filtrar por tipo o estado y observar la actualización instantánea de los KPIs y gráficos de distribución.
   - **Préstamos y Asignaciones:** Revisar los contadores superiores, filtrar por vencimiento (`por_vencer`, `vencido`), pulsar "Exportar CSV" para descargar el reporte auditado y registrar una nueva asignación seleccionando el área solicitante.
   - **Mantenimiento TI:** Visualizar la lista de mantenimientos preventivos y correctivos. Iniciar la atención de un mantenimiento programado y completarlo registrando el diagnóstico técnico.
   - **Control de SLAs:** Visualizar el radar en tiempo real de solicitudes TI, los temporizadores de primera respuesta y resolución, y el catálogo de políticas con horas fraccionarias.
   - **Bandeja de Notificaciones:** Hacer clic en la campana de alertas en la parte superior derecha para inspeccionar las alertas de riesgo y vencimiento generadas algorítmicamente.
   - **Restablecer Demo:** Pulsar el botón "Restablecer Demo" en el encabezado para restaurar la base de datos IndexedDB local a los fixtures de prueba originales.

### Opción B: Modo Backend Laravel con PostgreSQL
1. En `backend/`, ejecutar las migraciones aditivas:
   ```bash
   php artisan migrate
   ```
2. Ejecutar la suite de pruebas unitarias:
   ```bash
   vendor/bin/phpunit tests/Unit
   ```
   Resultado esperado: **15 tests, 220 assertions passing (100% OK)**.

