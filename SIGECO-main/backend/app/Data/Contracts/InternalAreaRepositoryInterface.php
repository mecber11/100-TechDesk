<?php

namespace App\Data\Contracts;

use App\Domain\Org\InternalArea;
use Illuminate\Support\Collection;

interface InternalAreaRepositoryInterface
{
    public function find(int|string $id): ?InternalArea;

    public function findByCode(string $code, bool $onlyActive = false): ?InternalArea;

    public function active(): Collection;
}
