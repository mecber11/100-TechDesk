<?php

namespace App\Data\Eloquent;

use App\Domain\Sec\User;

class UserRepository extends EloquentRepository
{
    protected string $model = User::class;

    protected array $search = ['correo', 'nombre_completo'];

    protected array $with = ['roles'];

    protected string $orderBy = 'nombre_completo';

    protected string $orderDir = 'asc';

    protected bool $softArchive = true;

    protected string $archiveColumn = 'activo';
}
