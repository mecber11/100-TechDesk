<?php

use App\Http\Controllers\Api\AssetAssignmentController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AssetMaintenanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\InternalAreaController;
use App\Http\Controllers\Api\InternalOrderController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\OpsDashboardController;
use App\Http\Controllers\Api\SlaController;
use App\Http\Controllers\Api\TeamManagementController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:registration');

    // Streaming de archivos de imágenes de activos (acceso público para etiquetas <img> del navegador)
    Route::get('techdesk/asset-images/{id}/file', [AssetController::class, 'serveImageFile'])->whereNumber('id');
    Route::get('techdesk/assets/images/{id}/file', [AssetController::class, 'serveImageFile'])->whereNumber('id');

    Route::middleware('api.token')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::get('modules', [\App\Http\Controllers\Api\PlatformConfigurationController::class, 'modules']);
        Route::middleware('role:Plataforma_Admin')->prefix('platform')->group(function () {
            Route::get('settings', [\App\Http\Controllers\Api\PlatformConfigurationController::class, 'show']);
            Route::put('settings', [\App\Http\Controllers\Api\PlatformConfigurationController::class, 'update']);
        });
        Route::post('auth/password', [AuthController::class, 'changePassword']);
        Route::get('lookups', [LookupController::class, 'index']);
        Route::get('ops', [OpsDashboardController::class, 'index']);

        // Team Management
        Route::get('team', [TeamManagementController::class, 'index']);
        Route::get('team/pending', [TeamManagementController::class, 'pending']);
        Route::post('team', [TeamManagementController::class, 'store']);
        Route::put('team/{id}/slack', [TeamManagementController::class, 'slack']);
        Route::post('team/{id}/approve', [TeamManagementController::class, 'approve']);
        Route::post('team/{id}/reject', [TeamManagementController::class, 'reject']);
        Route::post('team/{id}/suspend', [TeamManagementController::class, 'suspend']);
        Route::post('team/{id}/reactivate', [TeamManagementController::class, 'reactivate']);
        Route::post('team/{id}/remove', [TeamManagementController::class, 'remove']);
        Route::delete('team/{id}', [TeamManagementController::class, 'remove']);

        Route::get('internal-orders', [InternalOrderController::class, 'index']);
        Route::get('internal-orders/{id}', [InternalOrderController::class, 'show'])->whereNumber('id');
        Route::post('internal-orders/assist', [InternalOrderController::class, 'assist'])->middleware('module:ia');
        Route::post('internal-orders', [InternalOrderController::class, 'store']);
        Route::post('internal-orders/{id}/move', [InternalOrderController::class, 'move']);
        Route::get('internal-orders/attachments/{id}', [InternalOrderController::class, 'attachment']);

        // TechDesk: Mis activos asignados (para cualquier usuario autenticado)
        Route::get('techdesk/my-assets', [AssetAssignmentController::class, 'myAssets']);

        // TechDesk Suite: Módulo de Gestión de Activos, SLAs y Mantenimiento TI
        Route::middleware('role:TI_Encargado|TI_Equipo|Administrador_Empresa|Super_Admin|SuperAdmin')->prefix('techdesk')->group(function () {
            // Imágenes de activos
            Route::post('assets/images', [AssetController::class, 'uploadImage']);
            Route::get('assets/images/reusable', [AssetController::class, 'reusableImages']);
            Route::post('asset-images', [AssetController::class, 'uploadImage']);
            Route::get('asset-images', [AssetController::class, 'reusableImages']);
            Route::get('asset-images/reusable', [AssetController::class, 'reusableImages']);

            // Activos de TI y Valoración
            Route::get('assets/valuation', [AssetController::class, 'valuation']);
            Route::get('assets', [AssetController::class, 'index']);
            Route::get('assets/kpis', [AssetController::class, 'kpis']);
            Route::get('assets/stock', [AssetController::class, 'stock']);
            Route::get('assets/{id}', [AssetController::class, 'show'])->whereNumber('id');
            Route::post('assets', [AssetController::class, 'store']);
            Route::put('assets/{id}', [AssetController::class, 'update'])->whereNumber('id');
            Route::delete('assets/{id}', [AssetController::class, 'destroy'])->whereNumber('id');

            // Asignaciones y préstamos
            Route::get('assignments/summary', [AssetAssignmentController::class, 'summary']);
            Route::get('assignments/export', [AssetAssignmentController::class, 'export']);
            Route::get('assignments/lookups', [AssetAssignmentController::class, 'lookups']);
            Route::get('assignment-lookups', [AssetAssignmentController::class, 'lookups']);
            Route::get('assignments', [AssetAssignmentController::class, 'index']);
            Route::get('assignments/{id}', [AssetAssignmentController::class, 'show'])->whereNumber('id');
            Route::post('assignments', [AssetAssignmentController::class, 'store']);
            Route::post('assignments/{id}/return', [AssetAssignmentController::class, 'return'])->whereNumber('id');
            Route::get('assignments/history/{assetId}', [AssetAssignmentController::class, 'history'])->whereNumber('assetId');

            // Mantenimientos
            Route::get('maintenances', [AssetMaintenanceController::class, 'index']);
            Route::get('maintenances/{id}', [AssetMaintenanceController::class, 'show'])->whereNumber('id');
            Route::post('maintenances', [AssetMaintenanceController::class, 'store']);
            Route::put('maintenances/{id}', [AssetMaintenanceController::class, 'update'])->whereNumber('id');
            Route::delete('maintenances/{id}', [AssetMaintenanceController::class, 'destroy'])->whereNumber('id');
            Route::get('maintenances/asset/{assetId}', [AssetMaintenanceController::class, 'forAsset'])->whereNumber('assetId');

            // Políticas de SLA y Métricas
            Route::get('sla/policies', [SlaController::class, 'policies']);
            Route::post('sla/policies', [SlaController::class, 'storePolicy']);
            Route::put('sla/policies/{id}', [SlaController::class, 'updatePolicy'])->whereNumber('id');
            Route::get('sla/dashboard', [SlaController::class, 'dashboard']);
            Route::get('sla/order/{orderId}', [SlaController::class, 'orderMetric'])->whereNumber('orderId');

            // Notificaciones internas de TechDesk (Bandeja SLA)
            Route::get('sla/notifications', [SlaController::class, 'notifications']);
            Route::put('sla/notifications/{id}/read', [SlaController::class, 'markNotificationRead'])->whereNumber('id');
            Route::post('sla/notifications/{id}/read', [SlaController::class, 'markNotificationRead'])->whereNumber('id');
            Route::post('sla/notifications/read-all', [SlaController::class, 'markAllNotificationsRead']);
            Route::get('notifications', [SlaController::class, 'notifications']);
            Route::post('notifications/{id}/read', [SlaController::class, 'markNotificationRead'])->whereNumber('id');
            Route::post('notifications/mark-all-read', [SlaController::class, 'markAllNotificationsRead']);
        });

        Route::middleware(['module:documentos', 'role:Administrador_Empresa|Super_Admin|SuperAdmin|TI_Encargado|TI_Equipo|Administracion_Encargado|Administracion_Equipo'])->group(function () {
            Route::apiResource('documents', DocumentController::class)->parameters(['documents' => 'id']);
            Route::post('documents/{id}/publish', [DocumentController::class, 'publish']);
            Route::post('documents/{id}/obsolete', [DocumentController::class, 'obsolete']);
            Route::post('documents/{id}/versions', [DocumentController::class, 'version']);
            Route::get('documents/{id}/file', [DocumentController::class, 'download']);

        });

        Route::middleware('role:Administrador_Empresa|Super_Admin|SuperAdmin')->group(function () {
            Route::apiResource('areas', InternalAreaController::class)->parameters(['areas' => 'id']);
            Route::apiResource('users', UserController::class)->parameters(['users' => 'id']);
        });

    });
});
