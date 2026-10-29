<?php

namespace App\Data\Eloquent;

use App\Common\Dto\PaginationDto;
use App\Domain\Docs\DocType;
use App\Domain\Docs\Document;
use App\Domain\Docs\DocumentVersion;
use App\Domain\Org\InternalArea;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DocumentRepository extends EloquentRepository
{
    protected string $model = Document::class;

    protected array $search = ['codigo', 'titulo', 'resumen'];

    protected array $with = ['type', 'ownerArea'];

    protected string $orderBy = 'codigo';

    public function paginateVisible(PaginationDto $pagination, ?int $areaId, bool $global): LengthAwarePaginator
    {
        $query = $this->query();
        if (! $global) {
            $query->where('id_area_propietaria', $areaId ?? 0);
        }
        if ($pagination->search) {
            $term = $pagination->search;
            $query->where(function (Builder $where) use ($term) {
                $where->where('codigo', 'ilike', "%{$term}%")
                    ->orWhere('titulo', 'ilike', "%{$term}%")
                    ->orWhere('resumen', 'ilike', "%{$term}%");
            });
        }

        return $query->orderBy('codigo')->paginate($pagination->perPage, ['*'], 'page', $pagination->page);
    }

    public function findVisible(int $id, ?int $areaId, bool $global): ?Document
    {
        return $this->query()
            ->when(! $global, fn (Builder $query) => $query->where('id_area_propietaria', $areaId ?? 0))
            ->find($id);
    }

    public function generateCode(int $typeId, int $areaId): ?string
    {
        $type = DocType::query()->find($typeId);
        $area = InternalArea::query()->find($areaId);
        if (! $type || ! $area) {
            return null;
        }

        return DB::selectOne('SELECT docs.fn_generate_document_code(?, ?) AS codigo', [$type->codigo, $area->codigo])->codigo;
    }

    public function createVersion(Document $document, array $payload): DocumentVersion
    {
        return DocumentVersion::query()->create([
            'id_documento' => $document->getKey(),
            'numero_version' => $payload['numero_version'],
            'contenido' => $payload['contenido'] ?? null,
            'enlace_archivo' => $payload['enlace_archivo'] ?? null,
            'motivo_cambio' => $payload['motivo_cambio'] ?? null,
            'creado_por' => $payload['creado_por'] ?? null,
        ]);
    }

    public function findForUpdate(int $id): ?Document
    {
        return Document::query()->lockForUpdate()->find($id);
    }
}
