<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\AssetAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AssetAssignmentService
{
    public function __construct(
        private readonly AssetAssignmentRepositoryInterface $assignments,
        private readonly AssetRepositoryInterface $assets
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->assignments->paginate($filters, $perPage);
    }

    public function getById(int $id): AssetAssignment
    {
        $assignment = $this->assignments->findById($id);
        if (! $assignment) {
            throw new DomainException('La asignación de activo no fue encontrada.', 'ASSIGNMENT_NOT_FOUND', 404);
        }

        return $assignment;
    }

    public function assignAsset(array $payload, int $assignedByUserId): AssetAssignment
    {
        $assetId = (int) ($payload['id_activo'] ?? 0);
        $asset = $this->assets->findById($assetId);

        if (! $asset) {
            throw new DomainException('El activo seleccionado no existe.', 'ASSET_NOT_FOUND', 404);
        }

        if ($asset->estado !== 'Disponible') {
            throw new DomainException("El activo {$asset->codigo_patrimonial} no está disponible (Estado actual: {$asset->estado}).", 'ASSET_NOT_AVAILABLE', 422);
        }

        $userId = (int) ($payload['id_usuario_asignado'] ?? 0);
        if ($userId <= 0) {
            throw new DomainException('Debe seleccionar el colaborador destinatario de la asignación.', 'USER_REQUIRED', 422);
        }

        $payload['asignado_por'] = $assignedByUserId;
        $payload['estado'] = 'Activo';

        return $this->assignments->createAssignment($payload);
    }

    public function returnAsset(int $id, array $returnData, int $receivedByUserId): AssetAssignment
    {
        $assignment = $this->getById($id);

        if ($assignment->estado === 'Devuelto') {
            throw new DomainException('Esta asignación ya fue registrada como devuelta anteriormente.', 'ALREADY_RETURNED', 422);
        }

        $returnData['recibido_por'] = $receivedByUserId;

        return $this->assignments->returnAssignment($assignment, $returnData);
    }

    public function getMyAssignedAssets(int $userId): Collection
    {
        return $this->assignments->activeAssignmentsForUser($userId);
    }

    public function getAssetHistory(int $assetId): Collection
    {
        return $this->assignments->historyForAsset($assetId);
    }
}
