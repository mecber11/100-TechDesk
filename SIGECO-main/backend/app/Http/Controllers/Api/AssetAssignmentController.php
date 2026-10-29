<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\AssetAssignmentService;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssetAssignmentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetAssignmentController extends Controller
{
    public function __construct(
        private readonly AssetAssignmentService $assignmentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status' => $request->query('status'),
            'user_id' => $request->query('user_id'),
            'asset_id' => $request->query('asset_id'),
            'search' => $request->query('search'),
        ];
        $perPage = (int) $request->query('per_page', 15);

        $list = $this->assignmentService->list($filters, $perPage);

        return response()->json($list);
    }

    public function show(int $id): JsonResponse
    {
        $assignment = $this->assignmentService->getById($id);

        return response()->json(['data' => $assignment]);
    }

    public function store(AssetAssignmentRequest $request): JsonResponse
    {
        $user = $request->user();
        $assignment = $this->assignmentService->assignAsset($request->validated(), $user->id_usuario);

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
        $assignment = $this->assignmentService->returnAsset($id, $validated, $user->id_usuario);

        return response()->json([
            'message' => 'Devolución de activo registrada correctamente.',
            'data' => $assignment,
        ]);
    }

    public function myAssets(Request $request): JsonResponse
    {
        $user = $request->user();
        $myAssets = $this->assignmentService->getMyAssignedAssets($user->id_usuario);

        return response()->json(['data' => $myAssets]);
    }

    public function history(int $assetId): JsonResponse
    {
        $history = $this->assignmentService->getAssetHistory($assetId);

        return response()->json(['data' => $history]);
    }
}
