<?php

namespace App\Data\Contracts;

use Illuminate\Support\Collection;

interface LookupRepositoryInterface
{
    public function documentTypes(): Collection;

    public function activeDocuments(): Collection;
}
