<?php

namespace App\Data\Contracts;

interface OpsDashboardRepositoryInterface
{
    public function snapshot(?int $areaId, ?int $requesterId = null): array;

    public function areaPerformance(): array;
}
