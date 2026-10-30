<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetMaintenanceRepositoryInterface;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\AssetMaintenance;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AssetMaintenanceService
{
    public function __construct(
        private readonly AssetMaintenanceRepositoryInterface $maintenances,
        private readonly AssetRepositoryInterface $assets
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->maintenances->paginate($filters, $perPage);
    }

    public function getById(int $id): AssetMaintenance
    {
        $maintenance = $this->maintenances->findById($id);
        if (! $maintenance) {
            throw new DomainException('El registro de mantenimiento no fue encontrado.', 'MAINTENANCE_NOT_FOUND', 404);
        }

        return $maintenance;
    }

    public function create(array $payload, int $creatorId): AssetMaintenance
    {
        $assetId = (int) ($payload['id_activo'] ?? 0);
        $asset = $this->assets->findById($assetId);

        if (! $asset) {
            throw new DomainException('El activo seleccionado para mantenimiento no existe.', 'ASSET_NOT_FOUND', 404);
        }

        $estado = $payload['estado'] ?? 'Programado';
        $allowedStates = ['Programado', 'EnProceso', 'Completado', 'Cancelado'];
        if (! in_array($estado, $allowedStates, true)) {
            $estado = 'Programado';
        }

        if ($estado === 'Completado') {
            if (empty($payload['tecnico_responsable'])) {
                throw new DomainException('Debe especificar el técnico responsable para registrar un mantenimiento completado.', 'TECHNICIAN_REQUIRED', 422);
            }
            if (empty($payload['diagnostico_solucion'])) {
                throw new DomainException('Debe registrar el diagnóstico y solución aplicada al completar la intervención.', 'DIAGNOSIS_REQUIRED', 422);
            }
        }

        $payload['realizado_por'] = $creatorId;
        $payload['estado'] = $estado;
        $payload['costo'] = max(0.0, (float) ($payload['costo'] ?? 0));

        return $this->maintenances->create($payload);
    }

    public function update(int $id, array $payload): AssetMaintenance
    {
        $maintenance = $this->getById($id);

        if (isset($payload['costo'])) {
            $payload['costo'] = max(0.0, (float) $payload['costo']);
        }

        $targetState = $payload['estado'] ?? $maintenance->estado;

        if ($targetState === 'Completado') {
            $tech = $payload['tecnico_responsable'] ?? $maintenance->tecnico_responsable;
            $diag = $payload['diagnostico_solucion'] ?? $maintenance->diagnostico_solucion;

            if (empty($tech)) {
                throw new DomainException('Debe especificar el técnico responsable para completar la intervención.', 'TECHNICIAN_REQUIRED', 422);
            }
            if (empty($diag)) {
                throw new DomainException('Debe registrar el diagnóstico o solución aplicada para completar la intervención.', 'DIAGNOSIS_REQUIRED', 422);
            }
        }

        return $this->maintenances->update($maintenance, $payload);
    }

    public function delete(int $id): void
    {
        $maintenance = $this->getById($id);
        $this->maintenances->delete($maintenance);
    }

    public function listForAsset(int $assetId): Collection
    {
        return $this->maintenances->listByAsset($assetId);
    }
}
