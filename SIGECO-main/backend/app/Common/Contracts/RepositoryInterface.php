<?php

namespace App\Common\Contracts;

use Illuminate\Support\Collection;

interface RepositoryInterface
{
    public function find(int $id): mixed;

    public function all(): Collection;

    public function save(object $entity): object;

    public function delete(int $id): void;
}
