<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\SlaService;
use App\Http\Controllers\Controller;
use App\Http\Requests\SlaPolicyRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlaController extends Controller
{
    public function __construct(
        private readonly SlaService $slaService
    ) {}

    public function policies(): JsonResponse
    {
        $policies = $this->slaService->listPolicies();

        return response()->json(['data' => $policies]);
    }

    public function storePolicy(SlaPolicyRequest $request): JsonResponse
    {
        $policy = $this->slaService->savePolicy($request->validated());

        return response()->json([
            'message' => 'Política de SLA registrada exitosamente.',
            'data' => $policy,
        ], 201);
    }

    public function updatePolicy(SlaPolicyRequest $request, int $id): JsonResponse
    {
        $policy = $this->slaService->savePolicy($request->validated(), $id);

        return response()->json([
            'message' => 'Política de SLA actualizada exitosamente.',
            'data' => $policy,
        ]);
    }

    public function dashboard(): JsonResponse
    {
        $metrics = $this->slaService->getDashboardMetrics();

        return response()->json(['data' => $metrics]);
    }

    public function orderMetric(int $orderId): JsonResponse
    {
        $metric = $this->slaService->getMetricByOrder($orderId);

        return response()->json(['data' => $metric]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id_usuario ?? $user->id ?? null;
        $notifications = $this->slaService->getNotifications($userId);

        return response()->json(['data' => $notifications]);
    }

    public function markNotificationRead(int $id): JsonResponse
    {
        $success = $this->slaService->markNotificationRead($id);

        return response()->json([
            'message' => $success ? 'Notificación marcada como leída.' : 'Notificación no encontrada.',
            'success' => $success,
        ]);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id_usuario ?? $user->id ?? null;
        $count = $this->slaService->markAllNotificationsRead($userId);

        return response()->json([
            'message' => "Se marcaron {$count} notificaciones como leídas.",
            'count' => $count,
        ]);
    }
}
