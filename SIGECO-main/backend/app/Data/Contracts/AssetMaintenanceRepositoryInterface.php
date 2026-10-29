<?php

namespace App\Data\Contracts;

use App\Domain\TechDesk\AssetMaintenance;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface AssetMaintenanceRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator;

    public function findById(int $id): ?AssetMaintenance;

    public function create(array $data): AssetMaintenance;

    public function update(AssetMaintenance $maintenance, array $data): AssetMaintenance;

    public function delete(AssetMaintenance $maintenance): void;

    public function listByAsset(int $assetId): Collection;
}
