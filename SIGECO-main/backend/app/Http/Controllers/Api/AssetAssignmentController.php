<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\AssetAssignmentService;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssetAssignmentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AssetAssignmentController extends Controller
{
    public function __construct(
        private readonly AssetAssignmentService $assignmentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'status',
            'user_id',
            'asset_id',
            'requesting_area_id',
            'destination_area_id',
            'order_id',
            'assigned_by',
            'received_by',
            'assigned_from',
            'assigned_to',
            'due_from',
            'due_to',
            'returned_from',
            'returned_to',
            'asset_type',
            'due_status',
            'search',
            'order_by',
            'order_dir',
        ]);
        $perPage = (int) $request->query('per_page', 15);

        $list = $this->assignmentService->list($filters, $perPage);

        return response()->json($list);
    }

    public function show(int $id): JsonResponse
    {
        $assignment = $this->assignmentService->getById($id);

        return response()->json(['data' => $assignment]);
    }

    public function summary(Request $request): JsonResponse
    {
        $filters = $request->only([
            'status',
            'user_id',
            'asset_id',
            'requesting_area_id',
            'destination_area_id',
            'order_id',
            'assigned_by',
            'received_by',
            'assigned_from',
            'assigned_to',
            'due_from',
            'due_to',
            'returned_from',
            'returned_to',
            'asset_type',
            'due_status',
            'search',
        ]);

        $summary = $this->assignmentService->getSummary($filters);

        return response()->json(['data' => $summary]);
    }

    public function export(Request $request): Response
    {
        $filters = $request->only([
            'status',
            'user_id',
            'asset_id',
            'requesting_area_id',
            'destination_area_id',
            'order_id',
            'assigned_by',
            'received_by',
            'assigned_from',
            'assigned_to',
            'due_from',
            'due_to',
            'returned_from',
            'returned_to',
            'asset_type',
            'due_status',
            'search',
        ]);

        $csv = $this->assignmentService->exportCsv($filters);
        $filename = 'prestamos_techdesk_' . now()->setTimezone('America/Lima')->format('Ymd_His') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    public function lookups(): JsonResponse
    {
        $data = $this->assignmentService->getLookups();

        return response()->json(['data' => $data]);
    }

    public function store(AssetAssignmentRequest $request): JsonResponse
    {
        $user = $request->user();
        $assignedBy = $user->id_usuario ?? $user->id ?? 1;
        $assignment = $this->assignmentService->assignAsset($request->validated(), $assignedBy);

        return response()->json([
            'message' => 'Activo asignado exitosamente.',
            'data' => $assignment,
        ], 201);
    }

    public function return(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'condicion_devolucion' => 'required|string|max:100',
            'observaciones_devolucion' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $receivedBy = $user->id_usuario ?? $user->id ?? 1;
        $assignment = $this->assignmentService->returnAsset($id, $validated, $receivedBy);

        return response()->json([
            'message' => 'Devolución de activo registrada correctamente.',
            'data' => $assignment,
        ]);
    }

    public function myAssets(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id_usuario ?? $user->id ?? 1;
        $myAssets = $this->assignmentService->getMyAssignedAssets($userId);

        return response()->json(['data' => $myAssets]);
    }

    public function history(int $assetId): JsonResponse
    {
        $history = $this->assignmentService->getAssetHistory($assetId);

        return response()->json(['data' => $history]);
    }
}
