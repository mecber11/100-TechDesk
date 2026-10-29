<?php

namespace App\Data\Eloquent;

use App\Common\Contracts\RepositoryInterface;
use App\Common\Dto\PaginationDto;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

abstract class EloquentRepository implements RepositoryInterface
{
    /** @var class-string<Model> */
    protected string $model;

    /** @var list<string> */
    protected array $search = [];

    /** @var list<string> */
    protected array $with = [];

    protected string $orderBy = '';

    protected string $orderDir = 'asc';

    protected bool $softArchive = false;

    protected string $archiveColumn = 'is_active';

    public function query(): Builder
    {
        return ($this->model)::query()->with($this->with);
    }

    public function find(int|string $id): mixed
    {
        return $this->query()->find($id);
    }

    public function all(): Collection
    {
        $order = $this->orderBy ?: (new ($this->model)())->getKeyName();

        return $this->query()->orderBy($order, $this->orderDir)->get();
    }

    public function paginate(PaginationDto $pagination): LengthAwarePaginator
    {
        $q = $this->query();
        if ($pagination->search && $this->search) {
            $term = $pagination->search;
            $q->where(function (Builder $w) use ($term) {
                foreach ($this->search as $i => $col) {
                    $method = $i === 0 ? 'where' : 'orWhere';
                    $w->{$method}($col, 'ilike', "%{$term}%");
                }
            });
        }
        $this->applyFilters($q, $pagination);
        $order = $this->orderBy ?: (new ($this->model)())->getKeyName();

        return $q->orderBy($order, $this->orderDir)
            ->paginate($pagination->perPage, ['*'], 'page', $pagination->page);
    }

    protected function applyFilters(Builder $q, PaginationDto $pagination): void
    {
        // hook
    }

    public function save(object $entity): object
    {
        /** @var Model $entity */
        $entity->save();

        return $entity->fresh($this->with) ?? $entity;
    }

    public function delete(int $id): void
    {
        if ($this->softArchive) {
            ($this->model)::query()->whereKey($id)->update([$this->archiveColumn => false]);

            return;
        }
        ($this->model)::query()->whereKey($id)->delete();
    }

    public function new(array $payload): Model
    {
        return new ($this->model)($payload);
    }

    public function transaction(callable $callback): mixed
    {
        return DB::transaction($callback);
    }
}
