<?php

namespace App\Data\Contracts;

use App\Domain\TechDesk\AssetAssignment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface AssetAssignmentRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator;

    public function findById(int $id): ?AssetAssignment;

    public function createAssignment(array $data): AssetAssignment;

    public function returnAssignment(AssetAssignment $assignment, array $returnData): AssetAssignment;

    public function activeAssignmentsForUser(int $userId): Collection;

    public function historyForAsset(int $assetId): Collection;
}
