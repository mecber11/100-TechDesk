<?php

namespace App\Data\Contracts;

use App\Domain\Req\InternalOrder;
use App\Domain\Req\InternalOrderAttachment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface InternalOrderRepositoryInterface
{
    public function nextCode(): string;

    public function paginateVisible(
        ?int $areaId,
        bool $global,
        ?string $status,
        int $perPage,
        ?string $day = null,
        ?string $month = null,
        ?int $year = null,
        ?int $requesterId = null,
    ): LengthAwarePaginator;

    public function findOrder(int $id): ?InternalOrder;

    public function withLockedOrder(int $id, callable $callback): mixed;

    public function findAttachment(int $id): ?InternalOrderAttachment;

    public function createWithDetails(array $payload, array $items, array $files = []): InternalOrder;

    public function saveTransition(
        InternalOrder $order,
        string $fromStatus,
        ?string $note,
        int $actorId,
        array $files = [],
        array $driveLinks = [],
    ): InternalOrder;
}
