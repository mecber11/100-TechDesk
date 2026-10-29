<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\AssetService;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function __construct(
        private readonly AssetService $assetService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search' => $request->query('search'),
            'tipo' => $request->query('tipo'),
            'estado' => $request->query('estado'),
            'condicion' => $request->query('condicion'),
        ];
        $perPage = (int) $request->query('per_page', 15);

        $paginated = $this->assetService->list($filters, $perPage);

        return response()->json($paginated);
    }

    public function show(int $id): JsonResponse
    {
        $asset = $this->assetService->getById($id);

        return response()->json(['data' => $asset]);
    }

    public function store(AssetRequest $request): JsonResponse
    {
        $user = $request->user();
        $asset = $this->assetService->create($request->validated(), $user->id_usuario);

        return response()->json([
            'message' => 'Activo registrado exitosamente.',
            'data' => $asset,
        ], 201);
    }

    public function update(AssetRequest $request, int $id): JsonResponse
    {
        $asset = $this->assetService->update($id, $request->validated());

        return response()->json([
            'message' => 'Activo actualizado exitosamente.',
            'data' => $asset,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->assetService->delete($id);

        return response()->json(['message' => 'Activo eliminado correctamente.']);
    }

    public function stock(Request $request): JsonResponse
    {
        $type = $request->query('tipo');
        $available = $this->assetService->getAvailableStock($type);

        return response()->json(['data' => $available]);
    }

    public function kpis(): JsonResponse
    {
        $metrics = $this->assetService->getKpis();

        return response()->json(['data' => $metrics]);
    }
}
