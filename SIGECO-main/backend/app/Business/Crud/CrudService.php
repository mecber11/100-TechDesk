<?php

namespace App\Business\Crud;

use App\Common\Dto\PaginationDto;
use App\Common\Exceptions\DomainException;
use App\Data\Eloquent\EloquentRepository;
use Illuminate\Database\Eloquent\Model;

abstract class CrudService
{
    public function __construct(protected EloquentRepository $repo) {}

    public function list(PaginationDto $pagination)
    {
        return $this->repo->paginate($pagination);
    }

    public function all()
    {
        return $this->repo->all();
    }

    public function get(int|string $id): Model
    {
        $entity = $this->repo->find($id);
        if (! $entity) {
            throw new DomainException('Registro no encontrado.', 'RECORD_NOT_FOUND', 404);
        }

        return $entity;
    }

    public function create(array $payload): Model
    {
        return $this->repo->save($this->repo->new($payload));
    }

    public function update(int|string $id, array $payload): Model
    {
        $entity = $this->get($id);
        $entity->fill($payload);

        return $this->repo->save($entity);
    }

    public function delete(int|string $id): void
    {
        $this->repo->delete((int) $id);
    }
}
