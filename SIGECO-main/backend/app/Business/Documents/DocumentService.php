<?php

namespace App\Business\Documents;

use App\Business\Areas\AreaContextService;
use App\Business\Crud\CrudService;
use App\Common\Dto\PaginationDto;
use App\Common\Exceptions\DomainException;
use App\Data\Eloquent\DocumentRepository;
use App\Domain\Sec\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class DocumentService extends CrudService
{
    public function __construct(
        private readonly DocumentRepository $documents,
        private readonly AreaContextService $areas,
    ) {
        parent::__construct($documents);
    }

    public function listForUser(PaginationDto $pagination, User $user)
    {
        return $this->documents->paginateVisible(
            $pagination,
            $this->areas->area($user)?->id_area,
            $this->areas->hasGlobalVisibility($user),
        );
    }

    public function getForUser(int $id, User $user): Model
    {
        $document = $this->documents->findVisible(
            $id,
            $this->areas->area($user)?->id_area,
            $this->areas->hasGlobalVisibility($user),
        );
        if (! $document) {
            throw new DomainException('Documento no encontrado.', 'DOCUMENT_NOT_FOUND', 404);
        }

        return $document;
    }

    public function createForUser(array $payload, User $user, ?UploadedFile $file = null): Model
    {
        $this->assertOwner($payload, $user);

        $path = null;
        try {
            if ($file) {
                $name = Str::limit(preg_replace('/[^\pL\pN._ -]/u', '_', basename($file->getClientOriginalName())), 160, '');
                $path = $file->storeAs('documents/'.Str::uuid(), $name, 'local');
                if (! $path) {
                    throw new DomainException('No se pudo guardar el archivo.', 'DOCUMENT_FILE_SAVE', 422);
                }
                $payload['enlace_archivo'] = $path;
            }
            return $this->create($payload);
        } catch (Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }
    }

    public function updateForUser(int $id, array $payload, User $user): Model
    {
        $document = $this->getForUser($id, $user);
        if (isset($payload['id_area_propietaria'])) {
            $this->assertOwner($payload, $user);
        }
        $document->fill($payload);

        return $this->documents->save($document);
    }

    public function deleteForUser(int $id, User $user): void
    {
        $document = $this->getForUser($id, $user);
        $paths = $document->versions()->pluck('enlace_archivo')->push($document->enlace_archivo)
            ->filter(fn ($path) => is_string($path) && str_starts_with($path, 'documents/') && ! str_contains($path, '..'))
            ->unique()->values()->all();
        try {
            $this->documents->transaction(fn () => $document->delete());
        } catch (QueryException $exception) {
            throw new DomainException('No se pudo eliminar el documento. Puede estar vinculado a otros registros.', 'DOCUMENT_DELETE', 422);
        }
        if ($paths) Storage::disk('local')->delete($paths);
    }

    private function assertOwner(array $payload, User $user): void
    {
        if ($this->areas->hasGlobalVisibility($user)) {
            return;
        }
        $areaId = $this->areas->area($user)?->id_area;
        if (! $areaId || (int) ($payload['id_area_propietaria'] ?? 0) !== $areaId) {
            throw new DomainException('No puedes gestionar documentos de otra área.', 'DOCUMENT_AREA_FORBIDDEN', 403);
        }
    }

    public function create(array $payload): Model
    {
        return $this->documents->transaction(function () use ($payload) {
            if (empty($payload['codigo'])) {
                $payload['codigo'] = $this->documents->generateCode($payload['id_tipo_documento'], $payload['id_area_propietaria']);
                if (! $payload['codigo']) {
                    throw new DomainException('El tipo de documento o el área no existen.', 'INVALID_DOCUMENT_REFERENCE', 422);
                }
            }
            $payload['estado'] ??= 'Borrador';
            $payload['version_actual'] ??= 1;
            $payload['actualizado_en'] = now();

            try {
                $doc = parent::create($payload);
                $this->documents->createVersion($doc, [
                    'numero_version' => 1,
                    'contenido' => $payload['contenido'] ?? null,
                    'enlace_archivo' => $payload['enlace_archivo'] ?? null,
                    'motivo_cambio' => 'Alta de documento',
                    'creado_por' => $payload['creado_por'] ?? null,
                ]);
            } catch (QueryException $e) {
                throw new DomainException('No se pudo guardar el documento. Revisa el código o el título.', 'DOC_SAVE', 422);
            }

            return $doc->load(['type', 'ownerArea', 'versions']);
        });
    }

    public function publish(int $id, ?int $userId = null): Model
    {
        return $this->update($id, [
            'estado' => 'Vigente',
            'vigente_desde' => now()->toDateString(),
            'actualizado_en' => now(),
        ]);
    }

    public function obsolete(int $id): Model
    {
        return $this->update($id, ['estado' => 'Obsoleto', 'actualizado_en' => now()]);
    }

    public function newVersion(int $id, array $payload, ?int $userId = null): Model
    {
        return $this->documents->transaction(function () use ($id, $payload, $userId) {
            $doc = $this->documents->findForUpdate($id);
            if (! $doc) {
                throw new DomainException('Documento no encontrado.', 'DOCUMENT_NOT_FOUND', 404);
            }
            $next = ((int) $doc->version_actual) + 1;

            $this->documents->createVersion($doc, [
                'numero_version' => $next,
                'contenido' => $payload['contenido'] ?? $doc->contenido,
                'enlace_archivo' => $payload['enlace_archivo'] ?? $doc->enlace_archivo,
                'motivo_cambio' => $payload['motivo_cambio'] ?? 'Nueva versión',
                'creado_por' => $userId,
            ]);

            $doc->fill([
                'contenido' => $payload['contenido'] ?? $doc->contenido,
                'enlace_archivo' => $payload['enlace_archivo'] ?? $doc->enlace_archivo,
                'version_actual' => $next,
                'estado' => $payload['estado'] ?? $doc->estado,
                'actualizado_en' => now(),
            ]);

            return $this->documents->save($doc);
        });
    }
}
