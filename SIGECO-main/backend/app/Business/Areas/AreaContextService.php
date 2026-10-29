<?php

namespace App\Business\Areas;

use App\Common\Support\AreaAccess;
use App\Data\Contracts\InternalAreaRepositoryInterface;
use App\Domain\Org\InternalArea;
use App\Domain\Sec\User;
use Illuminate\Support\Collection;

class AreaContextService
{
    public function __construct(
        private readonly AreaAccess $access,
        private readonly InternalAreaRepositoryInterface $areas,
    ) {}

    public function area(User $user): ?InternalArea
    {
        if ($user->id_area) {
            return $this->areas->find($user->id_area);
        }

        $code = $this->access->areaCodeFromRoles($this->access->roles($user));

        return $code ? $this->areas->findByCode($code) : null;
    }

    public function byCode(string $code, bool $onlyActive = false): ?InternalArea
    {
        return $this->areas->findByCode($code, $onlyActive);
    }

    public function byId(int $id): ?InternalArea
    {
        return $this->areas->find($id);
    }

    public function active(): Collection
    {
        return $this->areas->active();
    }

    public function hasGlobalVisibility(User $user): bool
    {
        return $this->access->hasGlobalVisibility($user);
    }

    public function isSuperAdmin(User $user): bool
    {
        return $this->access->isSuperAdmin($user);
    }

    public function isCompanyAdmin(User $user): bool
    {
        return $this->access->isCompanyAdmin($user);
    }

    public function isTi(User $user): bool
    {
        return $this->access->isTi($user);
    }

    public function isManager(User $user): bool
    {
        return $this->access->isManager($user);
    }

    public function canManageArea(User $user, InternalArea $area): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        return $this->isManager($user) && $this->area($user)?->id_area === $area->id_area;
    }

    public function registrationArea(string $value): ?array
    {
        return $this->access->registrationArea($value);
    }
}
