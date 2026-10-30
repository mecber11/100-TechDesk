<?php

namespace App\Http\Controllers\Api;

use App\Business\TechDesk\AssetService;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        $creatorId = $user->id_usuario ?? $user->id ?? 1;
        $asset = $this->assetService->create($request->validated(), $creatorId);

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

    public function valuation(Request $request): JsonResponse
    {
        $filters = $request->only([
            'tipo',
            'estado',
            'marca',
            'modelo',
            'adquisicion_desde',
            'adquisicion_hasta',
            'area_id',
            'search',
            'valoracion_status',
        ]);

        $summary = $this->assetService->getValuation($filters);

        return response()->json(['data' => $summary]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $file = $request->file('imagen') ?? $request->file('image') ?? $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json(['message' => 'No se recibió un archivo de imagen válido.'], 422);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (! in_array($file->getMimeType(), $allowedMimes, true)) {
            return response()->json(['message' => 'Solo se admiten formatos JPEG, PNG y WebP.'], 422);
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json(['message' => 'La imagen excede el límite permitido de 5 MB.'], 422);
        }

        $user = $request->user();
        $creatorId = $user->id_usuario ?? $user->id ?? 1;

        $image = $this->assetService->uploadImage($file, $creatorId);

        return response()->json([
            'message' => 'Imagen cargada y procesada exitosamente.',
            'data' => [
                'id_imagen' => $image->id_imagen,
                'image_id' => $image->id_imagen,
                'url' => $image->url,
                'mime' => $image->mime,
                'tamano_bytes' => $image->tamano_bytes,
                'nombre_original' => $image->nombre_original,
                'hash_sha256' => $image->hash_sha256,
            ],
        ], 201);
    }

    public function serveImageFile(int $id): BinaryFileResponse
    {
        $imageInfo = $this->assetService->getImageFile($id);

        return response()->file($imageInfo['path'], [
            'Content-Type' => $imageInfo['mime'],
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function reusableImages(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $images = $this->assetService->listReusableImages($search);

        return response()->json(['data' => $images]);
    }
}
