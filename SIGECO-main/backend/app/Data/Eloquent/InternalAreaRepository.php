<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\InternalAreaRepositoryInterface;
use App\Domain\Org\InternalArea;
use Illuminate\Support\Collection;

class InternalAreaRepository extends EloquentRepository implements InternalAreaRepositoryInterface
{
    protected string $model = InternalArea::class;

    protected array $search = ['codigo', 'nombre', 'finalidad'];

    protected array $with = ['members'];

    protected string $orderBy = 'orden';

    protected bool $softArchive = true;

    protected string $archiveColumn = 'activa';

    public function find(int|string $id): ?InternalArea
    {
        return InternalArea::query()->find($id);
    }

    public function findByCode(string $code, bool $onlyActive = false): ?InternalArea
    {
        $query = InternalArea::query()->where('codigo', strtoupper($code));
        if ($onlyActive) {
            $query->where('activa', true);
        }

        return $query->first();
    }

    public function active(): Collection
    {
        return InternalArea::query()
            ->where('activa', true)
            ->orderBy('orden')
            ->get(['id_area', 'codigo', 'nombre', 'finalidad', 'orden', 'activa']);
    }
}
