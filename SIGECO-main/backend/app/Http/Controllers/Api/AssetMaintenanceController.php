<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\AssetMaintenanceService;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssetMaintenanceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetMaintenanceController extends Controller
{
    public function __construct(
        private readonly AssetMaintenanceService $maintenanceService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status' => $request->query('status'),
            'tipo' => $request->query('tipo'),
            'asset_id' => $request->query('asset_id'),
            'search' => $request->query('search'),
        ];
        $perPage = (int) $request->query('per_page', 15);

        $list = $this->maintenanceService->list($filters, $perPage);

        return response()->json($list);
    }

    public function show(int $id): JsonResponse
    {
        $maintenance = $this->maintenanceService->getById($id);

        return response()->json(['data' => $maintenance]);
    }

    public function store(AssetMaintenanceRequest $request): JsonResponse
    {
        $user = $request->user();
        $maintenance = $this->maintenanceService->create($request->validated(), $user->id_usuario);

        return response()->json([
            'message' => 'Mantenimiento programado/registrado exitosamente.',
            'data' => $maintenance,
        ], 201);
    }

    public function update(AssetMaintenanceRequest $request, int $id): JsonResponse
    {
        $maintenance = $this->maintenanceService->update($id, $request->validated());

        return response()->json([
            'message' => 'Mantenimiento actualizado exitosamente.',
            'data' => $maintenance,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->maintenanceService->delete($id);

        return response()->json(['message' => 'Registro de mantenimiento eliminado correctamente.']);
    }

    public function forAsset(int $assetId): JsonResponse
    {
        $records = $this->maintenanceService->listForAsset($assetId);

        return response()->json(['data' => $records]);
    }
}
