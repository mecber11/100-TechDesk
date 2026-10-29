<?php

namespace App\Http\Controllers\Api;

use App\Business\Areas\InternalAreaService;
use App\Http\Controllers\Api\Concerns\CrudController;

class InternalAreaController extends CrudController
{
    public function __construct(InternalAreaService $service)
    {
        parent::__construct($service);
    }

    protected function rules(bool $partial = false): array
    {
        return [
            'codigo' => 'required|string|max:20',
            'nombre' => 'required|string|max:120',
            'finalidad' => 'nullable|string|max:300',
            'orden' => 'sometimes|integer',
            'activa' => 'sometimes|boolean',
        ];
    }
}
