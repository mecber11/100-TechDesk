<?php

namespace App\Data\Contracts;

use App\Domain\TechDesk\OrderSla;
use App\Domain\TechDesk\SlaPolicy;
use Illuminate\Support\Collection;

interface SlaRepositoryInterface
{
    public function listPolicies(): Collection;

    public function findPolicy(int $id): ?SlaPolicy;

    public function savePolicy(array $data, ?int $id = null): SlaPolicy;

    public function findMatchingPolicy(string $priority, ?string $category = null): ?SlaPolicy;

    public function findMetricByOrder(int $orderId): ?OrderSla;

    public function saveOrderSla(array $data): OrderSla;

    public function getActiveOrdersForSlaTracking(): Collection;

    public function getSlaDashboardMetrics(): array;
}
