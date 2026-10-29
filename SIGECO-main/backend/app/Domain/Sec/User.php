<?php

namespace App\Domain\Sec;

use App\Domain\Org\InternalArea;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $table = 'sec.usuarios';

    protected $primaryKey = 'id_usuario';

    public $timestamps = false;

    protected $guarded = [];

    protected $hidden = ['contrasena'];

    protected $appends = ['user_id', 'email', 'full_name'];

    public function getUserIdAttribute(): mixed
    {
        return $this->id_usuario;
    }

    public function getEmailAttribute(): mixed
    {
        return $this->correo;
    }

    public function getFullNameAttribute(): mixed
    {
        return $this->nombre_completo;
    }

    protected $casts = [
        'activo' => 'bool',
        'cambiar_contrasena' => 'bool',
        'ultimo_ingreso' => 'datetime',
        'creado_en' => 'datetime',
        'suspendido_en' => 'datetime',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'sec.usuarios_roles', 'id_usuario', 'id_rol');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(InternalArea::class, 'id_area');
    }

    public function getAuthPassword(): string
    {
        return $this->contrasena;
    }
}
