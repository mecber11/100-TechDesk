<?php

namespace App\Data\Contracts;

use App\Domain\Sec\User;
use Illuminate\Support\Collection;

interface TeamRepositoryInterface
{
    public function members(?int $areaId, ?string $status = null): Collection;

    public function findWithArea(int $id): ?User;
    public function saveSlack(User $user, string $slackId): void;

    public function changeStatus(User $user, string $status): void;

    public function removeMember(User $user): void;

    public function purgeExpiredSuspendedUsers(): int;

    public function findManagedAreaId(int $userId): ?int;

    public function emailExists(string $email): bool;

    public function findByEmail(string $email): ?User;

    public function createUser(array $userData, int $areaId, string $areaCode, string $roleName, bool $isLead): User;
}
