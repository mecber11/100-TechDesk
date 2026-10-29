<?php

namespace App\Business\TechDesk;

use App\Common\Exceptions\DomainException;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Domain\TechDesk\Asset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AssetService
{
    public function __construct(
        private readonly AssetRepositoryInterface $assets
    ) {}

    public function list(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->assets->paginate($filters, $perPage);
    }

    public function getById(int $id): Asset
    {
        $asset = $this->assets->findById($id);
        if (! $asset) {
            throw new DomainException('El activo tecnológico no fue encontrado.', 'ASSET_NOT_FOUND', 404);
        }

        return $asset;
    }

    public function create(array $payload, int $creatorId): Asset
    {
        $code = strtoupper(trim($payload['codigo_patrimonial'] ?? ''));
        if (empty($code)) {
            throw new DomainException('El código patrimonial es obligatorio.', 'INVALID_ASSET_CODE', 422);
        }

        $existing = $this->assets->findByPatrimonialCode($code);
        if ($existing) {
            throw new DomainException("El código patrimonial {$code} ya se encuentra registrado.", 'DUPLICATE_ASSET_CODE', 422);
        }

        $payload['codigo_patrimonial'] = $code;
        $payload['creado_por'] = $creatorId;
        $payload['estado'] = $payload['estado'] ?? 'Disponible';
        $payload['condicion_fisica'] = $payload['condicion_fisica'] ?? 'Bueno';
        $payload['vida_util_meses'] = max(1, (int) ($payload['vida_util_meses'] ?? 36));

        return $this->assets->create($payload);
    }

    public function update(int $id, array $payload): Asset
    {
        $asset = $this->getById($id);

        if (! empty($payload['codigo_patrimonial'])) {
            $code = strtoupper(trim($payload['codigo_patrimonial']));
            if ($code !== $asset->codigo_patrimonial) {
                $existing = $this->assets->findByPatrimonialCode($code);
                if ($existing) {
                    throw new DomainException("El código patrimonial {$code} ya pertenece a otro activo.", 'DUPLICATE_ASSET_CODE', 422);
                }
                $payload['codigo_patrimonial'] = $code;
            }
        }

        return $this->assets->update($asset, $payload);
    }

    public function delete(int $id): void
    {
        $asset = $this->getById($id);

        if ($asset->estado === 'Asignado') {
            throw new DomainException('No se puede eliminar un activo que actualmente está asignado a un usuario.', 'CANNOT_DELETE_ASSIGNED_ASSET', 422);
        }

        $this->assets->delete($asset);
    }

    public function getAvailableStock(?string $type = null): Collection
    {
        return $this->assets->getAvailableStock($type);
    }

    public function getKpis(): array
    {
        return $this->assets->getKpiMetrics();
    }
}
