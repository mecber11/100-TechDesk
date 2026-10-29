<?php

namespace App\Data\Eloquent;

use App\Data\Contracts\LookupRepositoryInterface;
use App\Domain\Docs\DocType;
use App\Domain\Docs\Document;
use Illuminate\Support\Collection;

class LookupRepository implements LookupRepositoryInterface
{
    public function documentTypes(): Collection
    {
        return DocType::query()->orderBy('nombre')->get();
    }

    public function activeDocuments(): Collection
    {
        return Document::query()->where('estado', 'Vigente')->orderBy('codigo')->get(['id_documento', 'codigo', 'titulo']);
    }
}
