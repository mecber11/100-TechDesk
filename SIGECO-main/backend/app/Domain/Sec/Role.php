<?php

namespace App\Domain\Sec;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $table = 'sec.roles';

    protected $primaryKey = 'id_rol';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'es_sistema' => 'bool',
        'activo' => 'bool',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'sec.roles_permisos', 'id_rol', 'id_permiso');
    }
}
