<?php

namespace App\Business\Areas;

use App\Business\Crud\CrudService;
use App\Data\Eloquent\InternalAreaRepository;

class InternalAreaService extends CrudService
{
    public function __construct(InternalAreaRepository $repo)
    {
        parent::__construct($repo);
    }
}
