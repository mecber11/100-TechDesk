<?php

namespace App\Domain\Sec;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $table = 'sec.permisos';

    protected $primaryKey = 'id_permiso';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [];
}
