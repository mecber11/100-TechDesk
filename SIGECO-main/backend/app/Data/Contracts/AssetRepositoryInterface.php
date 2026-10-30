<?php

namespace App\Data\Contracts;

use App\Domain\TechDesk\Asset;
use App\Domain\TechDesk\AssetImage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface AssetRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator;

    public function findById(int $id): ?Asset;

    public function findByPatrimonialCode(string $code): ?Asset;

    public function findByIdentifier(string $type, ?string $issuer, string $normalizedValue, ?int $excludeAssetId = null): ?Asset;

    public function create(array $data): Asset;

    public function update(Asset $asset, array $data): Asset;

    public function delete(Asset $asset): void;

    public function getAvailableStock(?string $type = null): Collection;

    public function getKpiMetrics(): array;

    public function getValuationSummary(array $filters = []): array;

    public function storeImage(array $data): AssetImage;

    public function findImageById(int $id): ?AssetImage;

    public function listReusableImages(?string $search = null): Collection;
}
